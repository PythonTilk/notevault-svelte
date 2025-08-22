export default {
  // Common actions
  actions: {
    save: 'Save',
    cancel: 'Cancel',
    delete: 'Delete',
    edit: 'Edit',
    create: 'Create',
    close: 'Close',
    open: 'Open',
    add: 'Add',
    remove: 'Remove',
    submit: 'Submit',
    confirm: 'Confirm',
    back: 'Back',
    next: 'Next',
    previous: 'Previous',
    search: 'Search',
    filter: 'Filter',
    sort: 'Sort',
    export: 'Export',
    import: 'Import',
    download: 'Download',
    upload: 'Upload',
    copy: 'Copy',
    cut: 'Cut',
    paste: 'Paste',
    undo: 'Undo',
    redo: 'Redo',
    refresh: 'Refresh',
    reset: 'Reset'
  },

  // Navigation
  navigation: {
    home: 'Home',
    dashboard: 'Dashboard',
    workspaces: 'Workspaces',
    notes: 'Notes',
    chat: 'Chat',
    files: 'Files',
    settings: 'Settings',
    profile: 'Profile',
    help: 'Help',
    about: 'About',
    logout: 'Logout',
    login: 'Login',
    register: 'Register'
  },

  // Common UI elements
  common: {
    loading: 'Loading...',
    error: 'Error',
    success: 'Success',
    warning: 'Warning',
    info: 'Information',
    confirmation: 'Confirmation',
    yes: 'Yes',
    no: 'No',
    ok: 'OK',
    done: 'Done',
    optional: 'Optional',
    required: 'Required',
    choose: 'Choose',
    select: 'Select',
    none: 'None',
    all: 'All',
    other: 'Other',
    unknown: 'Unknown',
    untitled: 'Untitled',
    name: 'Name',
    description: 'Description',
    title: 'Title',
    content: 'Content',
    type: 'Type',
    status: 'Status',
    date: 'Date',
    time: 'Time',
    size: 'Size',
    owner: 'Owner',
    author: 'Author',
    created: 'Created',
    updated: 'Updated',
    modified: 'Modified',
    version: 'Version'
  },

  // Time and dates
  time: {
    now: 'Now',
    today: 'Today',
    yesterday: 'Yesterday',
    tomorrow: 'Tomorrow',
    thisWeek: 'This Week',
    lastWeek: 'Last Week',
    nextWeek: 'Next Week',
    thisMonth: 'This Month',
    lastMonth: 'Last Month',
    nextMonth: 'Next Month',
    thisYear: 'This Year',
    lastYear: 'Last Year',
    nextYear: 'Next Year',
    seconds: {
      one: '{{count}} second',
      other: '{{count}} seconds'
    },
    minutes: {
      one: '{{count}} minute',
      other: '{{count}} minutes'
    },
    hours: {
      one: '{{count}} hour',
      other: '{{count}} hours'
    },
    days: {
      one: '{{count}} day',
      other: '{{count}} days'
    },
    weeks: {
      one: '{{count}} week',
      other: '{{count}} weeks'
    },
    months: {
      one: '{{count}} month',
      other: '{{count}} months'
    },
    years: {
      one: '{{count}} year',
      other: '{{count}} years'
    }
  },

  // Authentication
  auth: {
    login: 'Login',
    logout: 'Logout',
    register: 'Register',
    email: 'Email',
    password: 'Password',
    confirmPassword: 'Confirm Password',
    username: 'Username',
    displayName: 'Display Name',
    forgotPassword: 'Forgot Password?',
    resetPassword: 'Reset Password',
    changePassword: 'Change Password',
    currentPassword: 'Current Password',
    newPassword: 'New Password',
    rememberMe: 'Remember Me',
    loginSuccess: 'Successfully logged in',
    logoutSuccess: 'Successfully logged out',
    registrationSuccess: 'Account created successfully',
    invalidCredentials: 'Invalid email or password',
    emailRequired: 'Email is required',
    passwordRequired: 'Password is required',
    passwordTooShort: 'Password must be at least 8 characters',
    passwordMismatch: 'Passwords do not match',
    emailInvalid: 'Please enter a valid email address',
    usernameRequired: 'Username is required',
    usernameTaken: 'Username is already taken',
    emailTaken: 'Email is already registered'
  },

  // Workspaces
  workspaces: {
    workspace: 'Workspace',
    workspaces: 'Workspaces',
    myWorkspaces: 'My Workspaces',
    createWorkspace: 'Create Workspace',
    editWorkspace: 'Edit Workspace',
    deleteWorkspace: 'Delete Workspace',
    workspaceName: 'Workspace Name',
    workspaceDescription: 'Workspace Description',
    workspaceColor: 'Workspace Color',
    publicWorkspace: 'Public Workspace',
    privateWorkspace: 'Private Workspace',
    workspaceMembers: 'Workspace Members',
    inviteMembers: 'Invite Members',
    memberRole: 'Member Role',
    owner: 'Owner',
    admin: 'Admin',
    member: 'Member',
    viewer: 'Viewer',
    leaveWorkspace: 'Leave Workspace',
    workspaceCreated: 'Workspace created successfully',
    workspaceUpdated: 'Workspace updated successfully',
    workspaceDeleted: 'Workspace deleted successfully',
    noWorkspaces: 'No workspaces found',
    members: {
      one: '{{count}} member',
      other: '{{count}} members'
    }
  },

  // Notes
  notes: {
    note: 'Note',
    notes: 'Notes',
    myNotes: 'My Notes',
    createNote: 'Create Note',
    editNote: 'Edit Note',
    deleteNote: 'Delete Note',
    duplicateNote: 'Duplicate Note',
    noteTitle: 'Note Title',
    noteContent: 'Note Content',
    noteType: 'Note Type',
    textNote: 'Text Note',
    richNote: 'Rich Text Note',
    codeNote: 'Code Note',
    canvasNote: 'Canvas Note',
    publicNote: 'Public Note',
    privateNote: 'Private Note',
    noteTags: 'Tags',
    addTag: 'Add Tag',
    removeTag: 'Remove Tag',
    searchNotes: 'Search Notes',
    filterNotes: 'Filter Notes',
    sortNotes: 'Sort Notes',
    noteCreated: 'Note created successfully',
    noteUpdated: 'Note updated successfully',
    noteDeleted: 'Note deleted successfully',
    noteDuplicated: 'Note duplicated successfully',
    noNotes: 'No notes found',
    recentNotes: 'Recent Notes',
    favoriteNotes: 'Favorite Notes',
    sharedNotes: 'Shared Notes',
    notes_count: {
      one: '{{count}} note',
      other: '{{count}} notes'
    }
  },

  // Chat
  chat: {
    chat: 'Chat',
    messages: 'Messages',
    sendMessage: 'Send Message',
    messageInput: 'Type a message...',
    editMessage: 'Edit Message',
    deleteMessage: 'Delete Message',
    replyToMessage: 'Reply to Message',
    messageReactions: 'Reactions',
    addReaction: 'Add Reaction',
    removeReaction: 'Remove Reaction',
    onlineUsers: 'Online Users',
    userTyping: '{{user}} is typing...',
    multipleTyping: 'Several people are typing...',
    messageSent: 'Message sent',
    messageEdited: 'Message edited',
    messageDeleted: 'Message deleted',
    noMessages: 'No messages yet',
    startConversation: 'Start a conversation',
    users_online: {
      one: '{{count}} user online',
      other: '{{count}} users online'
    }
  },

  // Files
  files: {
    file: 'File',
    files: 'Files',
    myFiles: 'My Files',
    uploadFile: 'Upload File',
    uploadFiles: 'Upload Files',
    downloadFile: 'Download File',
    deleteFile: 'Delete File',
    fileName: 'File Name',
    fileSize: 'File Size',
    fileType: 'File Type',
    uploadDate: 'Upload Date',
    fileUploaded: 'File uploaded successfully',
    fileDeleted: 'File deleted successfully',
    filesUploaded: 'Files uploaded successfully',
    noFiles: 'No files found',
    dragDropFiles: 'Drag and drop files here, or click to select',
    maxFileSize: 'Maximum file size: {{size}}',
    allowedTypes: 'Allowed file types: {{types}}',
    files_count: {
      one: '{{count}} file',
      other: '{{count}} files'
    }
  },

  // Settings
  settings: {
    settings: 'Settings',
    generalSettings: 'General Settings',
    accountSettings: 'Account Settings',
    privacySettings: 'Privacy Settings',
    notificationSettings: 'Notification Settings',
    appearanceSettings: 'Appearance Settings',
    languageSettings: 'Language Settings',
    theme: 'Theme',
    language: 'Language',
    timezone: 'Timezone',
    dateFormat: 'Date Format',
    timeFormat: 'Time Format',
    notifications: 'Notifications',
    emailNotifications: 'Email Notifications',
    pushNotifications: 'Push Notifications',
    soundNotifications: 'Sound Notifications',
    desktopNotifications: 'Desktop Notifications',
    settingsSaved: 'Settings saved successfully',
    settingsError: 'Failed to save settings'
  },

  // Themes
  themes: {
    theme: 'Theme',
    themes: 'Themes',
    light: 'Light',
    dark: 'Dark',
    auto: 'Auto',
    system: 'System',
    cyberpunk: 'Cyberpunk',
    forest: 'Forest',
    ocean: 'Ocean',
    sunset: 'Sunset',
    themeChanged: 'Theme changed to {{theme}}'
  },

  // Layout
  layout: {
    layout: 'Layout',
    layouts: 'Layouts',
    classic: 'Classic',
    focus: 'Focus Mode',
    widescreen: 'Widescreen',
    compact: 'Compact',
    custom: 'Custom',
    sidebar: 'Sidebar',
    rightPanel: 'Right Panel',
    topBar: 'Top Bar',
    bottomBar: 'Bottom Bar',
    showSidebar: 'Show Sidebar',
    hideSidebar: 'Hide Sidebar',
    layoutChanged: 'Layout changed to {{layout}}'
  },

  // Keyboard shortcuts
  shortcuts: {
    keyboardShortcuts: 'Keyboard Shortcuts',
    shortcut: 'Shortcut',
    shortcuts: 'Shortcuts',
    action: 'Action',
    customizeShortcuts: 'Customize Shortcuts',
    resetShortcuts: 'Reset Shortcuts',
    shortcutsReset: 'Shortcuts reset to defaults'
  },

  // Errors and validation
  errors: {
    error: 'Error',
    errorOccurred: 'An error occurred',
    somethingWentWrong: 'Something went wrong',
    tryAgain: 'Please try again',
    pageNotFound: 'Page not found',
    accessDenied: 'Access denied',
    unauthorized: 'Unauthorized',
    forbidden: 'Forbidden',
    internalError: 'Internal server error',
    networkError: 'Network error',
    connectionLost: 'Connection lost',
    sessionExpired: 'Session expired',
    validationError: 'Validation error',
    requiredField: 'This field is required',
    invalidEmail: 'Invalid email address',
    invalidUrl: 'Invalid URL',
    invalidPhoneNumber: 'Invalid phone number',
    passwordTooShort: 'Password is too short',
    passwordTooWeak: 'Password is too weak',
    confirmPasswordMismatch: 'Passwords do not match',
    fileTooBig: 'File is too big',
    fileTypeNotAllowed: 'File type not allowed',
    quotaExceeded: 'Storage quota exceeded'
  },

  // Success messages
  success: {
    success: 'Success',
    operationSuccessful: 'Operation completed successfully',
    changesSaved: 'Changes saved successfully',
    itemCreated: 'Item created successfully',
    itemUpdated: 'Item updated successfully',
    itemDeleted: 'Item deleted successfully',
    itemCopied: 'Item copied successfully',
    emailSent: 'Email sent successfully',
    invitationSent: 'Invitation sent successfully',
    passwordChanged: 'Password changed successfully',
    profileUpdated: 'Profile updated successfully'
  },

  // Confirmation dialogs
  confirm: {
    confirm: 'Confirm',
    areYouSure: 'Are you sure?',
    deleteConfirm: 'Are you sure you want to delete this item?',
    deleteWorkspaceConfirm: 'Are you sure you want to delete this workspace? This action cannot be undone.',
    deleteNoteConfirm: 'Are you sure you want to delete this note? This action cannot be undone.',
    leaveWorkspaceConfirm: 'Are you sure you want to leave this workspace?',
    discardChanges: 'Discard changes?',
    unsavedChanges: 'You have unsaved changes. Are you sure you want to leave?',
    logoutConfirm: 'Are you sure you want to logout?',
    resetSettingsConfirm: 'Are you sure you want to reset all settings to defaults?'
  },

  // Accessibility
  accessibility: {
    screenReaderOnly: 'Screen reader only',
    skipToMain: 'Skip to main content',
    skipToNavigation: 'Skip to navigation',
    menuOpen: 'Menu opened',
    menuClosed: 'Menu closed',
    modalOpen: 'Modal opened',
    modalClosed: 'Modal closed',
    tabSelected: 'Tab {{tab}} selected',
    pageLoaded: 'Page loaded',
    formSubmitted: 'Form submitted',
    itemAdded: 'Item added',
    itemRemoved: 'Item removed',
    sortedBy: 'Sorted by {{field}}',
    filteredBy: 'Filtered by {{filter}}',
    searchResults: '{{count}} search results found',
    noSearchResults: 'No search results found'
  },

  // Command palette
  commandPalette: {
    commandPalette: 'Command Palette',
    searchCommands: 'Search commands...',
    noCommands: 'No commands found',
    recentCommands: 'Recent Commands',
    allCommands: 'All Commands'
  }
};