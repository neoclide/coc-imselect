# coc-imselect

Input method enhance for iTerm2 on mac.

![2019-02-26 15_11_49](https://user-images.githubusercontent.com/251450/53394376-0de0c980-39da-11e9-8d6f-8006f98af84f.gif)

This extension only works with neovim and when loaded as vim plugin.

## Install

For [vim-plug](https://github.com/junegunn/vim-plug) user, add

```vim
Plug 'neoclide/coc-imselect'
```

to your init.vim, and run `:PlugUpdate`

## Features

- Monitor input source change and highlight cursor.
- Change input source when necessary on insert.

## Options

- `imselect.defaultInput` default input source use in normal mode, default to `com.apple.keylayout.US`.

- `imselect.cursorHighlight` highlight cursor color, default to `65535,65535,0`.

  The syntax for color is `red,green,blue` where each value is a number between 0 and 65535.

- `imselect.enableStatusItem` enable status item in statusline.

## License

MIT
