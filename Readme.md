# coc-imselect

Input method enhance for vim on mac.

![2019-02-26 15_11_49](https://user-images.githubusercontent.com/251450/53394376-0de0c980-39da-11e9-8d6f-8006f98af84f.gif)

This extension works with vim8 and neovim, latest [coc.nvim](https://github.com/neoclide/coc.nvim) required.

## Install

Install [coc.nvim](https://github.com/neoclide/coc.nvim), then run command:

```vim
CocInstall coc-imselect
```

## Development

Use npm 11.9.0 with Node.js 20.19 or newer. On macOS, install the Xcode
command-line tools, then run:

```sh
npm ci
npm run typecheck
npm run build
```

`npm ci` builds the native input selector through the macOS-only postinstall
script. On other systems, `npm ci --ignore-scripts` allows TypeScript checking
and JavaScript builds, but does not build or validate the native selector.

## Features

- Monitor input source change and highlight cursor.
- Change input source when necessary on insert.

## Options

- `imselect.defaultInput` default input source use in normal mode, default to `com.apple.keylayout.US`.
- `imselect.enableStatusItem` enable status item in statusline.
- `imselect.enableFloating` enable floating window support for input method.

## License

MIT
