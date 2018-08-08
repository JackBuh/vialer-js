The following prerequisites apply when you want to release a branded version
of Vialer-js:

# Store accounts
Accounts for the following vendor stores:
* Google account for the [Chrome web store](https://chrome.google.com/webstore).
  A $5 developer fees need to be paid with a creditcard to enable publishing
  rights for the account.
* Mozilla developer account for the [addons store](https://addons.mozilla.org).


# Branding
Please do not publish Vialer-js under a different name with the same branding
as one of the existing brands. If you want to create your own brand, come up with
a branding name for your plugin and create branded versions of the following images:
* *menubar-active.png*
* *menubar-dnd.png*
* *menubar-disconnected.png*
* *menubar-inactive.png*
* *menubar-lock.png*
* *menubar-unavailable.png*
* *menubar-ringing-0.png...menubar-ringing-4.png (sprite animation)*
* *notification.png*
* *electron-systray.png*
* *electron-systray.icns*
* *logo-16.png*
* *logo-32.png*
* *logo-64.png*
* *logo-128.png*
* Plugin logo for the stores (logo-128.png can be reused)
* 1 Promotion tile for the Chrome store (440x280 png-file)
* 4 Promotional images/screenshots (640x400 png-files) for both stores.
* English and Dutch plugin description texts for the stores.
* Support email/phone/website.
* Google Analytics ID

## Provider integration
### VoIPGRID
* A branded portal URL for the VoIPGRID API.


# Manual deployment
* Add your brand, e.g. `yourbrand` in the `brands` section of .vialer-jsrc by copying the `bologna` brand.
* Modify the color palette of `yourbrand` to match your brand's color-scheme.
* Copy the `src/brand/vialer` directory and its content to `src/brand/yourbrand`. Make sure the name matches the key you
  used in the brands section of `.vialer-jsrc` exactly.
* Modify the images in `src/brand/yourbrand/img` to match your brand. Do not reuse the branded Vialer images listed in the `Prerequisites` section!
* Build your branded version:
```
gulp build --brand yourbrand --target chrome
gulp build --brand yourbrand --target firefox
gulp build --brand yourbrand --target electron
```

# Auto-deploy with Vialer-js releases
Please [contact us](http://voipgrid.nl/contact/) if you would like a branded plugin that is
going to be deployed together with the Vialer-js release cycle. We need the following
information to be able to deploy your brand:
* Deployment credentials for the [Chrome web store](https://chrome.google.com/webstore/developer/dashboard). See the `Preparation` section of {@tutorial deployment}.
* Your [Mozilla store](https://addons.mozilla.org/developers/addons) addon should have our developers included as collaborators.
