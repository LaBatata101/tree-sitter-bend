# tree-sitter-bend

Bend grammar for [tree-sitter](https://github.com/tree-sitter/tree-sitter)

# Using it in Neovim

First of all, you need to install [nvim-treesitter](https://github.com/nvim-treesitter/nvim-treesitter) with your
favorite dependency manager, I recommend [lazy.nvim](https://github.com/folke/lazy.nvim).

Now you should put this snippet of code in your Neovim configuration right after calling `require("nvim-treesitter.configs").setup()`.

```lua
local parser_config = require("nvim-treesitter.parsers").get_parser_configs()
parser_config.bend = {
  install_info = {
    url = "https://github.com/LaBatata101/tree-sitter-bend",
    files = { "src/parser.c", "src/scanner.c" },
    branch = "main",
  },
}

vim.filetype.add({
  extension = {
    bend = "bend",
  },
})

vim.treesitter.language.register("bend", { "bend" })
```

For highlights to work, you have to create a `queries/bend` directory in your Neovim configuration directory and copy
the file [highlights.scm](./queries/highlights.scm) into the `queries/bend` directory.
