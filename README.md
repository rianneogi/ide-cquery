# ide-cquery

[![Package Version](https://img.shields.io/apm/v/ide-cquery.svg)](https://atom.io/packages/ide-cquery)
[![Package Downloads](https://img.shields.io/apm/dm/ide-cquery.svg)](https://atom.io/packages/ide-cquery)

![Readme Pic](readme_pic.PNG)

Provides C and C++ language support for [Atom][atom] using
[Cquery language server][cquery]

## About

This is an Atom package that connects the [atom-ide-ui][atom-ide-ui] package to [cquery][cquery]. cquery is a highly-scalable, low-latency language server for C/C++/Objective-C.

This plugin provides ide-like features for C/C++ and Objective C, including Code Completion, Diagnostics, Find References etc.

All contributions and feedback are appreciated.

## Features
Code Completion

Diagnostics

Find References

Code Highlight

Definitions

Hyperclick

Datatips

Signature Helper

Outline

Semantic Highlighting

Inactive Regions

## Project Setup

To specify include directories and other clang options, a `compile_commands.json` file on your project root directory will suffice.

If you can't create a `compile_commands.json` file, you can alternatively add a file named `.cquery` to your project root directory.

Each argument in that file is separated by a newline. Lines starting with `#` are skipped. The first line can optionally be the path to the intended compiler, which can help if the standard library paths are relative to the binary. Here's an example:

```
# Driver
/usr/bin/clang++-4.0

# Language
-xc++
-std=c++11

# Includes
-I/work/cquery/third_party
```

## Requirements

+ [Atom 1.21-beta][atom]
+ [atom-ide-ui][atom-ide-ui] atom plugin
+ [clang][clang]
+ [cquery Language Server][cquery_wiki]

[atom]: http://atom.io/beta
[cquery]: https://github.com/cquery-project/cquery
[cquery_wiki]: https://github.com/cquery-project/cquery
[atom-ide-ui]: https://atom.io/packages/atom-ide-ui
[clang]: http://releases.llvm.org/download.html
