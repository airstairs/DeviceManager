module.exports = {
  packagerConfig: {
    icon: './build/icon', // Omit extension
    asar: true,
  },
  rebuildConfig: {},
  makers: [
    {
      name: '@electron-forge/maker-squirrel',
      config: {
        setupIcon: './build/icon.ico',
        createDesktopShortcut: true,
        createStartMenuShortcut: true,
      },
    },
  ],
};