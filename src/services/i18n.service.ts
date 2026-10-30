type LocaleKey =
  | 'settingsTitle'
  | 'settingsSubtitle'
  | 'saveButton'
  | 'saveSuccess'
  | 'saveError'
  | 'tabGeneral'
  | 'tabModel'
  | 'tabChat'
  | 'tabAppearance'
  | 'tabMemory'
  | 'tabMemories'
  | 'tabMemoriesSubtitle'
  | 'memorySaveTitle'
  | 'memorySaveDescription'
  | 'memoryReadTitle'
  | 'memoryReadDescription'
  | 'memorySavedTitle'
  | 'memorySavedDescription'
  | 'memoryLoading'
  | 'memoryEmpty'
  | 'memoryLoadError'
  | 'memoryDeleteError'
  | 'memoryDeleteLabel'
  | 'memoryClearAllLabel'
  | 'memoryClearError'
  | 'tabFiles'
  | 'settingTitleDefaultModel'
  | 'settingDescriptionDefaultModel'
  | 'settingTitleInstructions'
  | 'settingDescriptionInstructions'
  | 'instructionLabel'
  | 'addInstruction'
  | 'deleteInstruction'
  | 'emptyInstructions'
  | 'settingTitleContextLength'
  | 'settingDescriptionContextLength'
  | 'settingTitleTemperature'
  | 'settingDescriptionTemperature'
  | 'settingTitleTopP'
  | 'settingDescriptionTopP'
  | 'settingTitleTopK'
  | 'settingDescriptionTopK'
  | 'settingTitleTheme'
  | 'settingDescriptionTheme'
  | 'settingTitleLanguage'
  | 'settingDescriptionLanguage'
  | 'settingTitleAccentColor'
  | 'settingDescriptionAccentColor'
  | 'settingTitleMaxTokens'
  | 'settingDescriptionMaxTokens';

interface LocaleStrings {
  [key: string]: Record<LocaleKey, string>;
}

const translations: LocaleStrings = {
  English: {
    settingsTitle: 'Settings',
    settingsSubtitle: 'Customize your LocalMind experience',
    saveButton: 'Save Changes',
    saveSuccess: 'Settings saved successfully.',
    saveError: 'Failed to save settings. Please try again.',
    tabGeneral: 'General',
    tabModel: 'Model & Inference',
    tabChat: 'Chat',
    tabAppearance: 'Appearance',
    tabMemory: 'Context & Memory',
    tabMemories: 'Memories',
    tabMemoriesSubtitle: 'Saved facts and preferences',
    tabFiles: 'Files & Attachments',
    memorySaveTitle: 'Save memories',
    memorySaveDescription: 'Allow the assistant to save useful facts and preferences for future conversations.',
    memoryReadTitle: 'Read memories',
    memoryReadDescription: 'Allow the assistant to read saved memories when they may help answer a question.',
    memorySavedTitle: 'Saved memories',
    memorySavedDescription: 'Review and delete anything the assistant has saved.',
    memoryLoading: 'Loading memories...',
    memoryEmpty: 'No memories saved yet.',
    memoryLoadError: 'Memories could not be loaded. Please try again.',
    memoryDeleteError: 'This memory could not be deleted. Please try again.',
    memoryDeleteLabel: 'Delete memory',
    memoryClearAllLabel: 'Clear All',
    memoryClearError: 'Saved memories could not be cleared. Please try again.',
    settingTitleDefaultModel: 'Default Model',
    settingDescriptionDefaultModel: 'Model used for new conversations',
    settingTitleInstructions: 'Instructions',
    settingDescriptionInstructions: 'Instructions included with each chat request',
    instructionLabel: 'Instruction',
    addInstruction: 'Add instruction',
    deleteInstruction: 'Delete instruction',
    emptyInstructions: 'No instructions yet. Add one to guide the model.',
    settingTitleContextLength: 'Context Length',
    settingDescriptionContextLength: 'Maximum context window sent to the model',
    settingTitleTemperature: 'Temperature',
    settingDescriptionTemperature: 'Controls randomness in model responses',
    settingTitleTopP: 'Top P',
    settingDescriptionTopP: 'Probability mass to sample from for each token',
    settingTitleTopK: 'Top K',
    settingDescriptionTopK: 'Number of highest-probability tokens to consider',
    settingTitleTheme: 'Theme',
    settingDescriptionTheme: 'Visual theme preset for the app',
    settingTitleLanguage: 'Language',
    settingDescriptionLanguage: 'Preferred UI language',
    settingTitleAccentColor: 'Accent Color',
    settingDescriptionAccentColor: 'Pick a highlight color for the interface',
    settingTitleMaxTokens: 'Max Tokens',
    settingDescriptionMaxTokens: 'Maximum tokens to generate per response',
  },
  Romanian: {
    settingsTitle: 'Setări',
    settingsSubtitle: 'Personalizează experiența LocalMind',
    saveButton: 'Salvează modificările',
    saveSuccess: 'Setările au fost salvate cu succes.',
    saveError: 'Setările nu au putut fi salvate. Încearcă din nou.',
    tabGeneral: 'General',
    tabModel: 'Model & Inferență',
    tabChat: 'Chat',
    tabAppearance: 'Aspect',
    tabMemory: 'Context & Memorie',
    tabMemories: 'Memorii',
    tabMemoriesSubtitle: 'Informații și preferințe salvate',
    tabFiles: 'Fișiere & Atașamente',
    memorySaveTitle: 'Salvează amintiri',
    memorySaveDescription: 'Permite asistentului să salveze informații și preferințe utile pentru conversațiile viitoare.',
    memoryReadTitle: 'Citește amintirile',
    memoryReadDescription: 'Permite asistentului să citească amintirile salvate atunci când ajută la răspuns.',
    memorySavedTitle: 'Amintiri salvate',
    memorySavedDescription: 'Verifică și șterge amintirile salvate de asistent.',
    memoryLoading: 'Se încarcă amintirile...',
    memoryEmpty: 'Nu există amintiri salvate.',
    memoryLoadError: 'Amintirile nu au putut fi încărcate. Încearcă din nou.',
    memoryDeleteError: 'Această amintire nu a putut fi ștearsă. Încearcă din nou.',
    memoryDeleteLabel: 'Șterge amintirea',
    memoryClearAllLabel: 'Șterge tot',
    memoryClearError: 'Amintirile salvate nu au putut fi șterse. Încearcă din nou.',
    settingTitleDefaultModel: 'Model implicit',
    settingDescriptionDefaultModel: 'Model folosit pentru conversații noi',
    settingTitleInstructions: 'Instrucțiuni',
    settingDescriptionInstructions: 'Instrucțiuni incluse în fiecare solicitare de chat',
    instructionLabel: 'Instrucțiunea',
    addInstruction: 'Adaugă instrucțiune',
    deleteInstruction: 'Șterge instrucțiunea',
    emptyInstructions: 'Nu există instrucțiuni. Adaugă una pentru a ghida modelul.',
    settingTitleContextLength: 'Lungime context',
    settingDescriptionContextLength: 'Fereastra de context trimisă modelului',
    settingTitleTemperature: 'Temperatură',
    settingDescriptionTemperature: 'Controlează aleatorietatea răspunsurilor',
    settingTitleTopP: 'Top P',
    settingDescriptionTopP: 'Masa de probabilitate pentru eșantionare',
    settingTitleTopK: 'Top K',
    settingDescriptionTopK: 'Numărul de tokeni cu cea mai mare probabilitate',
    settingTitleTheme: 'Temă',
    settingDescriptionTheme: 'Presetare vizuală pentru aplicație',
    settingTitleLanguage: 'Limbă',
    settingDescriptionLanguage: 'Limbă preferată pentru UI',
    settingTitleAccentColor: 'Culoare accent',
    settingDescriptionAccentColor: 'Alege o culoare de evidențiere',
    settingTitleMaxTokens: 'Max Tokens',
    settingDescriptionMaxTokens: 'Numărul maxim de tokeni per răspuns',
  },
};

export function t(key: LocaleKey, language: string) {
  const locale = translations[language] || translations.English;
  return locale[key] || translations.English[key] || key;
}
