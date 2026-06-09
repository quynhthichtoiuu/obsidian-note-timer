import { App, Modal, Notice, Plugin, PluginSettingTab, Setting, TFile } from "obsidian";

interface TimerSettings {
  timedProp: string;
  extraProp: string;
  spendtimeProp: string;
  starttimeProp: string;
  endtimeProp: string;
  doneProp: string;
  logNowFormat: string;
}

const DEFAULT_SETTINGS: TimerSettings = {
  timedProp: "timed",
  extraProp: "extra",
  spendtimeProp: "total_time",
  starttimeProp: "start_time",
  endtimeProp: "end_time",
  doneProp: "done?",
  logNowFormat: "- YYYY-MM-DD HH:mm | ",
};

export default class NoteTimerPlugin extends Plugin {
  settings: TimerSettings;

  async onload() {
    await this.loadSettings();

    this.addRibbonIcon("play", "Start Timer", () => this.startTimer());
    this.addRibbonIcon("square", "Stop Timer", () => this.stopTimer());
    this.addRibbonIcon("plus-circle", "Add Extra Time", () => this.addExtraTime());
    this.addRibbonIcon("pencil", "Log Now", () => this.logNow());

    this.addCommand({ id: "start", name: "Start Timer", hotkeys: [{ modifiers: ["Ctrl", "Shift"], key: "s" }], callback: () => this.startTimer() });
    this.addCommand({ id: "stop", name: "Stop Timer", hotkeys: [{ modifiers: ["Ctrl", "Shift"], key: "x" }], callback: () => this.stopTimer() });
    this.addCommand({ id: "add-extra", name: "Add Extra Time", hotkeys: [{ modifiers: ["Ctrl", "Shift"], key: "e" }], callback: () => this.addExtraTime() });
    this.addCommand({ id: "log-now", name: "Log Now", hotkeys: [{ modifiers: ["Ctrl", "Shift"], key: "n" }], callback: () => this.logNow() });

    this.addSettingTab(new TimerSettingTab(this.app, this));

    this.registerMarkdownCodeBlockProcessor("timer", (source, el) => {
      this.createTimerButtons(el);
    });
  }

  async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }

  async saveSettings() {
    await this.saveData(this.settings);
  }

  formatDateTime(date: Date): string {
    const pad = (n: number) => n.toString().padStart(2, "0");
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
  }

  parseDateTime(str: string): number {
    if (!str) return NaN;
    const normalized = String(str).replace(" ", "T");
    return new Date(normalized).getTime();
  }

  formatMinutes(minutes: number): string {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
  }

  async startTimer() {
    const file = this.app.workspace.getActiveFile();
    if (!file) { new Notice("No active file"); return; }

    const content = await this.app.vault.read(file);
    const fm = this.app.metadataCache.getFileCache(file)?.frontmatter;
    const hasStartTime = fm && fm[this.settings.starttimeProp];

    if (hasStartTime) {
      new ConfirmRestartModal(this.app, this, file).open();
      return;
    }

    await this.doStartTimer(file);
  }

  async doStartTimer(file: TFile) {
    await this.app.fileManager.processFrontMatter(file, (fm) => {
      fm[this.settings.starttimeProp] = this.formatDateTime(new Date());
      delete fm[this.settings.endtimeProp];
      fm[this.settings.doneProp] = false;
    });

    new Notice(`Timer started for ${file.basename}`);
  }

  async stopTimer() {
    const file = this.app.workspace.getActiveFile();
    if (!file) { new Notice("No active file"); return; }

    const fm = this.app.metadataCache.getFileCache(file)?.frontmatter;
    if (fm?.[this.settings.endtimeProp]) {
      new ConfirmRestopModal(this.app, this, file).open();
      return;
    }

    await this.doStopTimer(file);
  }

  async doStopTimer(file: TFile, forceNow = false) {
    let elapsed = 0;
    let hasStartTime = false;

    await this.app.fileManager.processFrontMatter(file, (fm) => {
      const startStr = fm[this.settings.starttimeProp];
      if (!startStr) return;

      const startTime = this.parseDateTime(startStr);
      if (isNaN(startTime)) return;

      hasStartTime = true;

      const endStr = fm[this.settings.endtimeProp];
      const endTime = (!forceNow && endStr) ? this.parseDateTime(endStr) : Date.now();
      elapsed = Math.round((endTime - startTime) / 60000);

      const currentExtra = typeof fm[this.settings.extraProp] === "number" ? fm[this.settings.extraProp] : 0;

      if (!endStr || forceNow) {
        fm[this.settings.endtimeProp] = this.formatDateTime(new Date());
      }
      fm[this.settings.timedProp] = elapsed;
      fm[this.settings.spendtimeProp] = elapsed + currentExtra;
      fm[this.settings.doneProp] = true;
    });

    if (!hasStartTime) {
      new Notice("No start_time found in this file");
      return;
    }

    new Notice(`Timer stopped: +${this.formatMinutes(elapsed)}`);
  }

  addExtraTime() {
    const file = this.app.workspace.getActiveFile();
    if (!file) { new Notice("No active file"); return; }
    new AddExtraModal(this.app, this, file).open();
  }

  async doAddExtra(file: TFile, minutes: number) {
    await this.app.fileManager.processFrontMatter(file, (fm) => {
      const currentExtra = typeof fm[this.settings.extraProp] === "number" ? fm[this.settings.extraProp] : 0;
      const currentTimed = typeof fm[this.settings.timedProp] === "number" ? fm[this.settings.timedProp] : 0;
      fm[this.settings.extraProp] = currentExtra + minutes;
      fm[this.settings.spendtimeProp] = currentTimed + currentExtra + minutes;
    });

    new Notice(`Added ${minutes} minutes to ${file.basename}`);
  }

  logNow() {
    const editor = this.app.workspace.activeEditor?.editor;
    if (!editor) { new Notice("No active editor"); return; }

    const now = new Date();
    const pad = (n: number) => n.toString().padStart(2, "0");
    const formatted = this.settings.logNowFormat
      .replace(/\\n/g, "\n")
      .replace("YYYY", now.getFullYear().toString())
      .replace("MM", pad(now.getMonth() + 1))
      .replace("DD", pad(now.getDate()))
      .replace("HH", pad(now.getHours()))
      .replace("mm", pad(now.getMinutes()));

    editor.replaceSelection(formatted);
  }

  createTimerButtons(el: HTMLElement) {
    el.empty();
    const container = el.createDiv({ cls: "timer-buttons" });

    const startBtn = container.createEl("button", { text: "▶ Start", cls: "timer-btn" });
    const stopBtn = container.createEl("button", { text: "⏹ Stop", cls: "timer-btn" });
    const extraBtn = container.createEl("button", { text: "＋ Extra", cls: "timer-btn" });

    startBtn.onclick = (e) => { e.preventDefault(); this.startTimer(); };
    stopBtn.onclick = (e) => { e.preventDefault(); this.stopTimer(); };
    extraBtn.onclick = (e) => { e.preventDefault(); this.addExtraTime(); };
  }
}

class ConfirmRestartModal extends Modal {
  plugin: NoteTimerPlugin;
  file: TFile;

  constructor(app: App, plugin: NoteTimerPlugin, file: TFile) {
    super(app);
    this.plugin = plugin;
    this.file = file;
  }

  onOpen() {
    const { contentEl } = this;
    contentEl.addClass("timer-modal");
    const header = contentEl.createDiv({ cls: "timer-modal-header" });
    header.createEl("div", { text: "⏱️", cls: "timer-modal-icon" });
    const textWrap = header.createDiv({ cls: "timer-modal-text" });
    textWrap.createEl("h3", { text: "Timer is running", cls: "timer-modal-title" });
    textWrap.createEl("p", { text: "A timer is already running for this note.", cls: "timer-modal-desc" });

    const btnGroup = contentEl.createDiv({ cls: "timer-modal-buttons" });
    const restartBtn = btnGroup.createEl("button", { text: "Restart", cls: "timer-modal-btn timer-modal-btn-danger" });
    const continueBtn = btnGroup.createEl("button", { text: "Continue", cls: "timer-modal-btn timer-modal-btn-primary" });

    restartBtn.onclick = async () => { await this.plugin.doStartTimer(this.file); this.close(); };
    continueBtn.onclick = () => { new Notice("Timer continues"); this.close(); };
  }

  onClose() { this.contentEl.empty(); }
}

class ConfirmRestopModal extends Modal {
  plugin: NoteTimerPlugin;
  file: TFile;

  constructor(app: App, plugin: NoteTimerPlugin, file: TFile) {
    super(app);
    this.plugin = plugin;
    this.file = file;
  }

  onOpen() {
    const { contentEl } = this;
    contentEl.addClass("timer-modal");
    const header = contentEl.createDiv({ cls: "timer-modal-header" });
    header.createEl("div", { text: "✅", cls: "timer-modal-icon" });
    const textWrap = header.createDiv({ cls: "timer-modal-text" });
    textWrap.createEl("h3", { text: "Timer already stopped", cls: "timer-modal-title" });
    textWrap.createEl("p", { text: "This note is already marked as done.", cls: "timer-modal-desc" });

    const btnGroup = contentEl.createDiv({ cls: "timer-modal-buttons" });
    const recalcBtn = btnGroup.createEl("button", { text: "Recalculate", cls: "timer-modal-btn timer-modal-btn-danger" });
    const dismissBtn = btnGroup.createEl("button", { text: "Dismiss", cls: "timer-modal-btn timer-modal-btn-primary" });

    recalcBtn.onclick = async () => { await this.plugin.doStopTimer(this.file, true); this.close(); };
    dismissBtn.onclick = () => { this.close(); };
  }

  onClose() { this.contentEl.empty(); }
}

class AddExtraModal extends Modal {
  plugin: NoteTimerPlugin;
  file: TFile;

  constructor(app: App, plugin: NoteTimerPlugin, file: TFile) {
    super(app);
    this.plugin = plugin;
    this.file = file;
  }

  onOpen() {
    const { contentEl } = this;
    contentEl.addClass("timer-modal");
    const header = contentEl.createDiv({ cls: "timer-modal-header" });
    header.createEl("div", { text: "⏰", cls: "timer-modal-icon" });
    const textWrap = header.createDiv({ cls: "timer-modal-text" });
    textWrap.createEl("h3", { text: "Add Extra Time", cls: "timer-modal-title" });
    textWrap.createEl("p", { text: "Add minutes for offline work.", cls: "timer-modal-desc" });

    let minutes = 0;
    const inputWrap = contentEl.createDiv({ cls: "timer-modal-input-wrap" });
    const input = inputWrap.createEl("input", { type: "number", placeholder: "30", cls: "timer-modal-input" });
    inputWrap.createEl("span", { text: "minutes", cls: "timer-modal-input-suffix" });
    input.addEventListener("input", (e) => { minutes = parseInt((e.target as HTMLInputElement).value) || 0; });

    const btnGroup = contentEl.createDiv({ cls: "timer-modal-buttons" });
    const cancelBtn = btnGroup.createEl("button", { text: "Cancel", cls: "timer-modal-btn timer-modal-btn-danger" });
    const addBtn = btnGroup.createEl("button", { text: "Add", cls: "timer-modal-btn timer-modal-btn-primary" });

    cancelBtn.onclick = () => { this.close(); };
    addBtn.onclick = async () => {
      if (minutes > 0) {
        await this.plugin.doAddExtra(this.file, minutes);
        this.close();
      } else {
        new Notice("Please enter valid minutes");
      }
    };
  }

  onClose() { this.contentEl.empty(); }
}

class TimerSettingTab extends PluginSettingTab {
  plugin: NoteTimerPlugin;

  constructor(app: App, plugin: NoteTimerPlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display() {
    const { containerEl } = this;
    containerEl.empty();

    containerEl.createEl("h3", { text: "Property Names" });
    new Setting(containerEl).setName("Timed property").setDesc("Auto-tracked time (minutes)").addText((text) => text.setValue(this.plugin.settings.timedProp).onChange(async (v) => { this.plugin.settings.timedProp = v; await this.plugin.saveSettings(); }));
    new Setting(containerEl).setName("Extra property").setDesc("Manual added time (minutes)").addText((text) => text.setValue(this.plugin.settings.extraProp).onChange(async (v) => { this.plugin.settings.extraProp = v; await this.plugin.saveSettings(); }));
    new Setting(containerEl).setName("Total time property").setDesc("timed + extra (minutes)").addText((text) => text.setValue(this.plugin.settings.spendtimeProp).onChange(async (v) => { this.plugin.settings.spendtimeProp = v; await this.plugin.saveSettings(); }));
    new Setting(containerEl).setName("Start time property").addText((text) => text.setValue(this.plugin.settings.starttimeProp).onChange(async (v) => { this.plugin.settings.starttimeProp = v; await this.plugin.saveSettings(); }));
    new Setting(containerEl).setName("End time property").addText((text) => text.setValue(this.plugin.settings.endtimeProp).onChange(async (v) => { this.plugin.settings.endtimeProp = v; await this.plugin.saveSettings(); }));
    new Setting(containerEl).setName("Done property").setDesc("Set to true when timer stops").addText((text) => text.setValue(this.plugin.settings.doneProp).onChange(async (v) => { this.plugin.settings.doneProp = v; await this.plugin.saveSettings(); }));

    containerEl.createEl("h3", { text: "Log Now" });
    new Setting(containerEl).setName("Format").setDesc("YYYY, MM, DD, HH, mm").addText((text) => text.setValue(this.plugin.settings.logNowFormat).onChange(async (v) => { this.plugin.settings.logNowFormat = v; await this.plugin.saveSettings(); }));
  }
}
