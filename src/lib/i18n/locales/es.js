export default {
  // Acciones comunes
  actions: {
    save: 'Guardar',
    cancel: 'Cancelar',
    delete: 'Eliminar',
    edit: 'Editar',
    create: 'Crear',
    close: 'Cerrar',
    open: 'Abrir',
    add: 'Añadir',
    remove: 'Quitar',
    submit: 'Enviar',
    confirm: 'Confirmar',
    back: 'Atrás',
    next: 'Siguiente',
    previous: 'Anterior',
    search: 'Buscar',
    filter: 'Filtrar',
    sort: 'Ordenar',
    export: 'Exportar',
    import: 'Importar',
    download: 'Descargar',
    upload: 'Subir',
    copy: 'Copiar',
    cut: 'Cortar',
    paste: 'Pegar',
    undo: 'Deshacer',
    redo: 'Rehacer',
    refresh: 'Actualizar',
    reset: 'Restablecer'
  },

  // Navegación
  navigation: {
    home: 'Inicio',
    dashboard: 'Panel',
    workspaces: 'Espacios de trabajo',
    notes: 'Notas',
    chat: 'Chat',
    files: 'Archivos',
    settings: 'Configuración',
    profile: 'Perfil',
    help: 'Ayuda',
    about: 'Acerca de',
    logout: 'Cerrar sesión',
    login: 'Iniciar sesión',
    register: 'Registrarse'
  },

  // Elementos comunes de la interfaz
  common: {
    loading: 'Cargando...',
    error: 'Error',
    success: 'Éxito',
    warning: 'Advertencia',
    info: 'Información',
    confirmation: 'Confirmación',
    yes: 'Sí',
    no: 'No',
    ok: 'Aceptar',
    done: 'Hecho',
    optional: 'Opcional',
    required: 'Requerido',
    choose: 'Elegir',
    select: 'Seleccionar',
    none: 'Ninguno',
    all: 'Todo',
    other: 'Otro',
    unknown: 'Desconocido',
    untitled: 'Sin título',
    name: 'Nombre',
    description: 'Descripción',
    title: 'Título',
    content: 'Contenido',
    type: 'Tipo',
    status: 'Estado',
    date: 'Fecha',
    time: 'Hora',
    size: 'Tamaño',
    owner: 'Propietario',
    author: 'Autor',
    created: 'Creado',
    updated: 'Actualizado',
    modified: 'Modificado',
    version: 'Versión'
  },

  // Tiempo y fechas
  time: {
    now: 'Ahora',
    today: 'Hoy',
    yesterday: 'Ayer',
    tomorrow: 'Mañana',
    thisWeek: 'Esta semana',
    lastWeek: 'Semana pasada',
    nextWeek: 'Próxima semana',
    thisMonth: 'Este mes',
    lastMonth: 'Mes pasado',
    nextMonth: 'Próximo mes',
    thisYear: 'Este año',
    lastYear: 'Año pasado',
    nextYear: 'Próximo año',
    seconds: {
      one: '{{count}} segundo',
      other: '{{count}} segundos'
    },
    minutes: {
      one: '{{count}} minuto',
      other: '{{count}} minutos'
    },
    hours: {
      one: '{{count}} hora',
      other: '{{count}} horas'
    },
    days: {
      one: '{{count}} día',
      other: '{{count}} días'
    },
    weeks: {
      one: '{{count}} semana',
      other: '{{count}} semanas'
    },
    months: {
      one: '{{count}} mes',
      other: '{{count}} meses'
    },
    years: {
      one: '{{count}} año',
      other: '{{count}} años'
    }
  },

  // Autenticación
  auth: {
    login: 'Iniciar sesión',
    logout: 'Cerrar sesión',
    register: 'Registrarse',
    email: 'Correo electrónico',
    password: 'Contraseña',
    confirmPassword: 'Confirmar contraseña',
    username: 'Nombre de usuario',
    displayName: 'Nombre para mostrar',
    forgotPassword: '¿Olvidaste tu contraseña?',
    resetPassword: 'Restablecer contraseña',
    changePassword: 'Cambiar contraseña',
    currentPassword: 'Contraseña actual',
    newPassword: 'Nueva contraseña',
    rememberMe: 'Recordarme',
    loginSuccess: 'Sesión iniciada correctamente',
    logoutSuccess: 'Sesión cerrada correctamente',
    registrationSuccess: 'Cuenta creada exitosamente',
    invalidCredentials: 'Email o contraseña inválidos',
    emailRequired: 'El email es requerido',
    passwordRequired: 'La contraseña es requerida',
    passwordTooShort: 'La contraseña debe tener al menos 8 caracteres',
    passwordMismatch: 'Las contraseñas no coinciden',
    emailInvalid: 'Por favor ingresa un email válido',
    usernameRequired: 'El nombre de usuario es requerido',
    usernameTaken: 'El nombre de usuario ya está en uso',
    emailTaken: 'El email ya está registrado'
  },

  // Espacios de trabajo
  workspaces: {
    workspace: 'Espacio de trabajo',
    workspaces: 'Espacios de trabajo',
    myWorkspaces: 'Mis espacios de trabajo',
    createWorkspace: 'Crear espacio de trabajo',
    editWorkspace: 'Editar espacio de trabajo',
    deleteWorkspace: 'Eliminar espacio de trabajo',
    workspaceName: 'Nombre del espacio de trabajo',
    workspaceDescription: 'Descripción del espacio de trabajo',
    workspaceColor: 'Color del espacio de trabajo',
    publicWorkspace: 'Espacio de trabajo público',
    privateWorkspace: 'Espacio de trabajo privado',
    workspaceMembers: 'Miembros del espacio de trabajo',
    inviteMembers: 'Invitar miembros',
    memberRole: 'Rol del miembro',
    owner: 'Propietario',
    admin: 'Administrador',
    member: 'Miembro',
    viewer: 'Visualizador',
    leaveWorkspace: 'Abandonar espacio de trabajo',
    workspaceCreated: 'Espacio de trabajo creado exitosamente',
    workspaceUpdated: 'Espacio de trabajo actualizado exitosamente',
    workspaceDeleted: 'Espacio de trabajo eliminado exitosamente',
    noWorkspaces: 'No se encontraron espacios de trabajo',
    members: {
      one: '{{count}} miembro',
      other: '{{count}} miembros'
    }
  },

  // Notas
  notes: {
    note: 'Nota',
    notes: 'Notas',
    myNotes: 'Mis notas',
    createNote: 'Crear nota',
    editNote: 'Editar nota',
    deleteNote: 'Eliminar nota',
    duplicateNote: 'Duplicar nota',
    noteTitle: 'Título de la nota',
    noteContent: 'Contenido de la nota',
    noteType: 'Tipo de nota',
    textNote: 'Nota de texto',
    richNote: 'Nota de texto enriquecido',
    codeNote: 'Nota de código',
    canvasNote: 'Nota de lienzo',
    publicNote: 'Nota pública',
    privateNote: 'Nota privada',
    noteTags: 'Etiquetas',
    addTag: 'Añadir etiqueta',
    removeTag: 'Quitar etiqueta',
    searchNotes: 'Buscar notas',
    filterNotes: 'Filtrar notas',
    sortNotes: 'Ordenar notas',
    noteCreated: 'Nota creada exitosamente',
    noteUpdated: 'Nota actualizada exitosamente',
    noteDeleted: 'Nota eliminada exitosamente',
    noteDuplicated: 'Nota duplicada exitosamente',
    noNotes: 'No se encontraron notas',
    recentNotes: 'Notas recientes',
    favoriteNotes: 'Notas favoritas',
    sharedNotes: 'Notas compartidas',
    notes_count: {
      one: '{{count}} nota',
      other: '{{count}} notas'
    }
  },

  // Temas
  themes: {
    theme: 'Tema',
    themes: 'Temas',
    light: 'Claro',
    dark: 'Oscuro',
    auto: 'Automático',
    system: 'Sistema',
    cyberpunk: 'Cyberpunk',
    forest: 'Bosque',
    ocean: 'Océano',
    sunset: 'Atardecer',
    themeChanged: 'Tema cambiado a {{theme}}'
  },

  // Errores y validación
  errors: {
    error: 'Error',
    errorOccurred: 'Ocurrió un error',
    somethingWentWrong: 'Algo salió mal',
    tryAgain: 'Por favor intenta de nuevo',
    pageNotFound: 'Página no encontrada',
    accessDenied: 'Acceso denegado',
    unauthorized: 'No autorizado',
    forbidden: 'Prohibido',
    internalError: 'Error interno del servidor',
    networkError: 'Error de red',
    connectionLost: 'Conexión perdida',
    sessionExpired: 'Sesión expirada',
    validationError: 'Error de validación',
    requiredField: 'Este campo es requerido',
    invalidEmail: 'Dirección de email inválida',
    invalidUrl: 'URL inválida',
    invalidPhoneNumber: 'Número de teléfono inválido',
    passwordTooShort: 'La contraseña es muy corta',
    passwordTooWeak: 'La contraseña es muy débil',
    confirmPasswordMismatch: 'Las contraseñas no coinciden',
    fileTooBig: 'El archivo es muy grande',
    fileTypeNotAllowed: 'Tipo de archivo no permitido',
    quotaExceeded: 'Cuota de almacenamiento excedida'
  },

  // Mensajes de éxito
  success: {
    success: 'Éxito',
    operationSuccessful: 'Operación completada exitosamente',
    changesSaved: 'Cambios guardados exitosamente',
    itemCreated: 'Elemento creado exitosamente',
    itemUpdated: 'Elemento actualizado exitosamente',
    itemDeleted: 'Elemento eliminado exitosamente',
    itemCopied: 'Elemento copiado exitosamente',
    emailSent: 'Email enviado exitosamente',
    invitationSent: 'Invitación enviada exitosamente',
    passwordChanged: 'Contraseña cambiada exitosamente',
    profileUpdated: 'Perfil actualizado exitosamente'
  },

  // Diálogos de confirmación
  confirm: {
    confirm: 'Confirmar',
    areYouSure: '¿Estás seguro?',
    deleteConfirm: '¿Estás seguro de que quieres eliminar este elemento?',
    deleteWorkspaceConfirm: '¿Estás seguro de que quieres eliminar este espacio de trabajo? Esta acción no se puede deshacer.',
    deleteNoteConfirm: '¿Estás seguro de que quieres eliminar esta nota? Esta acción no se puede deshacer.',
    leaveWorkspaceConfirm: '¿Estás seguro de que quieres abandonar este espacio de trabajo?',
    discardChanges: '¿Descartar cambios?',
    unsavedChanges: 'Tienes cambios sin guardar. ¿Estás seguro de que quieres salir?',
    logoutConfirm: '¿Estás seguro de que quieres cerrar sesión?',
    resetSettingsConfirm: '¿Estás seguro de que quieres restablecer toda la configuración a los valores predeterminados?'
  }
};