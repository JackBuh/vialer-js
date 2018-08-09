# Release process
The Vialer-js deploy process knows alpha, beta and production release channels.
Each channel has its own separate Firefox/Chrome store entry. A release will
always be targetting the alpha channel first, so our bleeding-edge users
can verify in a week that the release works as expected. An alpha release will
always be a MINOR or a MAJOR semver version bump. Suppose the current public
version is `4.0.0`. Then the next alpha release will either be `4.1.0` or
`5.0.0`, depending on the nature of the changes. Basically the following applies:

* MAJOR when an incompatible API change influences (external) modules
* MINOR when new functionality is added in a backwards-compatible manner

Semver PATCH versions are bumped while the alpha version needs to be updated,
due to unencounted bugs or inconsistencies. So, `4.1.0` becomes `4.1.1`, `4.1.2`,
or `5.0.0` becomes `5.0.1`, `5.0.2`, etc., depending on the amount of bugfix
releases needed.

When the alpa testusers report a succesful release after a week, we proceed by
publishing the beta version to our larger testusers pool in the beta channel.
Then after a week again, when our beta testusers didn't encounter any problems,
we proceed by publish the production version to our main users.


# Preparation
Deployment to the Firefox and Chrome store is automated. In order to deploy
to either one, you first need to fill in API credentials in the following file:

```bash
cp .vialer-jsrc.example ~/.vialer-jsrc
```

For Firefox, fill in the `apiKey` and `apiSecret` from the
[API key](https://addons.mozilla.org/nl/developers/addon/api/key/) management page.
For Chrome, the initial setup requires an `extensionId`, `clientId`, `clientSecret`
and a `refreshToken`. See this
[manual](https://github.com/DrewML/chrome-webstore-upload/blob/master/How%20to%20generate%20Google%20API%20keys.md)
on how to lookup these fields. In both cases, you need to be an authorized
developer, in order to push to one of the stores.

To be able to push to npm, an authorized developer first have to login to the
`Spindle` npm account.

```bash
npm login
```

Checkout {@tutorial branding} if you want to be able to deploy multiple brands
at once. Make sure you distinguish between the correct `extensionId/extensionId_beta`
and `id/id_beta` in `.vialerjs-rc`.

# Beta release
1. Bump the version in package.json, e.g. 2.3.4.0.
2. Tag and commit the beta release
```bash
git tag -a v2.3.4.0 -m 'v2.3.4.0'
git push origin v2.3.4.0
git push origin master
```
3. Release the beta version:
```bash
gulp deploy-brands --deploy beta
```

# Public release
1. Update the `CHANGELOG.md` with all the changes since the last version

2. Bump the version:

   ```bash
   git tag -a v2.3.5 -m 'v2.3.5'
   git push origin 2.3.5
   git push origin master
   ```

3. Release the public version:
```bash
gulp deploy-brands --deploy production
```

4. Update the github pages hosted documentation
```bash
gulp docs-deploy
```

5. Add the following template to the Release notes for developers:		

```bash		
To confirm contents xpi and sources.zip:		
node -v		
# v9.3.0		
npm -v		
# 5.6.0
unzip *.xpi -d /tmp/vialer-js-xpi-unzipped  # download xpi and unzip
unzip sources.zip -d /tmp/vialer-js-sources-unzipped  # download sources and unzip		
cd /tmp/vialer-js-sources-unzipped		
npm i		
cp .vialer-jsrc.example .vialer-jsrc
NODE_ENV=production gulp build --target firefox		
cd -		
diff -r /tmp/vialer-js-xpi-unzipped /tmp/vialer-js-sources-unzipped/build/firefox		
rm -Rf /tmp/vialer-js*		
```		
* Upload sources.zip


# Additional info & tips

## Stores
Check the Google [developer dashboard](https://chrome.google.com/webstore/developer/dashboard?)
for the newly published plugin's status. The plugin will generally be updated to all users
within several hours, when the browser checks for extension updates. You can [manually override](https://developer.chrome.com/apps/autoupdate#testing) this behaviour in Chrome,
to see if the new version is updated correctly.


The Mozilla WebExtension release process is nowadays a lot faster than it used
to be. Checkout the [Mozilla developer dashboard](https://addons.mozilla.org/nl/developers/addon/vialer/versions)
for the release status. You can contact an AMO-editor on [irc](irc://mozilla.org/%23amo)
for help and questions about the reviewing process.

## Deployment tips
You can fine-tune deployment by supplying several build flags, e.g.:

   ```bash
   gulp deploy --target firefox --brand vialer --deploy beta
   ```
