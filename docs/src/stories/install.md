# Chrom(e/ium) WebExtension
```bash
# Generate a develop build.
# The used brand and target parameters are defaults and can be omitted.
gulp build --brand bologna --target chrome
# Or make a production build:
NODE_ENV=production gulp build --brand bologna --target chrome
# Make a distribtion-ready zip.
gulp build-dist --brand bologna --target chrome
```

Navigate to `chrome://extension`, make sure developer mode is enabled, and load
the `./build/bologna/chrome` directory as an unpacked extension in Chrome.
You can drag-and-drop the distribution zip file from `dist/chrome`  on the
Chrome extension page. Notice that this may not work on Chrome Windows.


# Electron desktop app
Vialer-js can run as a desktop app using Electron, although this
version is still **experimental** and not (yet) officially supported.
You're free to give it a spin though! It requires Electron to be installed
on your system. To run the desktop version:
```bash
gulp build --brand bologna --target electron
electron build/bologna/electron/main.js
```


# Firefox WebExtension
Firefox support is problematic at the moment, because Mozilla doesn't seem to
make it a priority to make WebRTC applications run within a WebExtension.
There is at least one [blocking ticket](https://bugzilla.mozilla.org/show_bug.cgi?id=1278100)
that prevents Vialer-js from running properly in Firefox. There currently
is a build target for Firefox, but don't expect it to work. We will update
this section when this changes.
```bash
gulp build --target firefox
# Or make a production build:
NODE_ENV=production gulp build --target firefox
```
Navigate to `about:debugging` and switch `Enable add-on debugging` on. Select
`Load Temporary Add-on` and point it to the `manifest.json` in the `build/firefox`
directory. Alternatively, you can run Firefox with the addon temporarily loaded
using web-ext in a new profile with:

    npm run test_firefox

There is no way to install unsigned xpi/zip files like with Chrome. The signed
and published Firefox xpi can be installed directly though.
