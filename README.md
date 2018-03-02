### 11.x branch

`src` contains the source files for the skins. Final edits are placed here and compiled for deployment

`dev` contains temporary versions for testing and development

Chrome 66 has a new feature we can use to make the live updating process easier

https://developers.google.com/web/updates/2018/01/devtools#overrides

There is an issue on nightly with this in that it is rebuilt so often that the query parameter on the tool.css file changes every day. This is fixable

`target` skins from `src` are built and placed here for deployment.


It looks like I lost the source files for the 11 skins... probably not worth it to reverse engineer them from the compiled version.
