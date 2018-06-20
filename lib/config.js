module.exports = {
  cqueryPath: {
    type: "string",
    default: "cquery",
    description: "Path to the cquery executable"
  },
  logging: {
    type: "boolean",
    default: false,
    description: "Enable logging for debugging ide-cquery and cquery"
  },
  logFile: {
    type: "string",
    default: "cquery_log.txt"
  },
  discoverSystemIncludes: {
    type: "boolean",
    default: true
  },
  enableSemanticHighlighting: {
    type: "boolean",
    default: false,
    description: "Enable Semantic Highlighting for context based text coloring (Edit your styles.less to customize the colors)"
  },
  enableSetInactiveRegions: {
    type: "boolean",
    default: false,
    description: "Enabling this option will fade out inactive regions of code, such as code inside a IFDEF block with the if condition unsatisfied"
  },
  initializationOptions: {
    type: "object",
    description: "Configure initialization options for cquery",
    properties: {
      compilationDatabaseCommand: {
        type: "string",
        description: "If specified, this option overrides compile_commands.json and this external command will be executed."
      },
      compilationDatabaseDirectory: {
        type: "string",
        description: "Directory containing compile_commands.json"
      },
      cacheDirectory: {
        type: "string",
        default: "$projectPath/.vscode/cquery_cached_index",
        description: "Cache directory for idnexed files"
      },
      cacheFormat: {
        type: "string",
        description: "Cache serialization format",
        default: "json",
        enum: [
          {
            value: "json",
            description: "Serialize in JSON format"
          },
          {
            value: "msgpack",
            description: "Serialize in msgpack format"
          }
        ]
      },
      extraClangArguments: {
        type: "array",
        default: [],
        description: "Additional arguments to pass to clang",
        items: {
          type: "string"
        }
      },
      client: {
        type: "object",
        description: "Client capabilities",
        properties: {
          snippetSupport: {
            type: "boolean",
            default: true,
            description: "Autocomplete results show as a snippet"
          }
        }
      },
      completion: {
        type: "object",
        description: "Autocompletion configuration",
        properties: {
          detailedLabel: {
            type: "boolean",
            default: true,
            description: "Enabled detailed completion labels (completion signature in autocomplete)"
          },
          includeBlacklist: {
            type: "array",
            description: "Regex patterns to exclude include completion candidates against. They receive the absolute file path.",
            default: [],
            items: {
              type: "string"
            }
          },
          includeMaxPathSize: {
            type: "integer",
            default: 30,
            description: "Maximum path length to show in completion results. Set to 0 or a negative number to disable"
          },
          includeSuffixWhitelist: {
            type: "array",
            default: [".h", ".hpp", ".hh"],
            description: "Whitelist file paths that will be tested against. If a file path does not end in one of these values, it will not be considered for auto-completion."
          },
          includeWhitelist: {
            type: "array",
            default: [],
            description: "Regex patterns to whitelist file paths to be considered for autocompletion. Slower than includeSuffixWhitelist"
          }
        }
      },
      diagnostics: {
        type: "object",
        description: "Diagnostics configuration",
        properties: {
          blacklist: {
            type: "array",
            default: [],
            description: "Don't publish diagnostics to blacklisted files (e.g. system header files)"
          },
          frequencyMs: {
            type: "integer",
            default: 0,
            description: "Cquery diagnostic publishing frequency (-1: never, 0: as often as possible, >0: at most this many milliesconds)"
          },
          onParse: {
            type: "boolean",
            default: true,
            description: "Diagnostics from a full document parse will be reported"
          },
          whitelist: {
            type: "array",
            default: [],
            description: "Regex patterns to whitelist file paths to have diagnostics published"
          }
        }
      },
      // highlight: {
      //   type: "object",
      //   description: "Semantic highlighting",
      //   properties: {
      //     blacklist: {
      //       type: "array",
      //       default: [],
      //       description: "Regex patterns to blacklist file paths to have semantic highlighting published"
      //     },
      //     whitelist: {
      //       type: "array",
      //       default: [],
      //       description: "Regex patterns to whitelist file paths to have semantic highlighting published"
      //     }
      //   }
      // },
      index: {
        type: "object",
        properties: {
          attributeMakeCallsToCtor: {
            type: "boolean",
            default: true,
            description: "Attempt to convert calls of make* functions to constructors based on heuristics"
          },
          blacklist: {
            type: "array",
            default: [],
            description: "Regex patterns to blacklist file paths to have indexed"
          },
          commentParsing: {
            type: "integer",
            default: 2,
            enum: [
              {
                value: 0,
                description: "None"
              },
              {
                value: 1,
                description: "Doxygen-Style"
              },
              {
                value: 2,
                description: "All comments"
              }
            ],
            description: "Instruct cquery how to parse comments"
          },
          enabled: {
            type: "boolean",
            default: true,
            description: "Enable the indexer"
          },
          logSkippedPaths: {
            type: "boolean",
            default: false
          },
          threads: {
            type: "integer",
            default: 0,
            description: "Number of indexer threads. If 0, 80% of cores will be used"
          }
        }
      },
      workspaceSymbol: {
        type: "object",
        properties: {
          maxNum: {
            type: "integer",
            default: 1000,
            description: "Maximum workspace search results"
          },
          sort: {
            type: "boolean",
            default: true
          }
        }
      },
      enableIndexOnDidChange: {
        type: "boolean",
        default: false,
        description: "Allow indexing on textDocument/didChange (may be slow for big projects)"
      },
      xref: {
        type: "object",
        properties: {
          container: {
            type: "boolean",
            default: false
          },
          maxNum: {
            type: "integer",
            default: 2000
          }
        }
      }
    }
  }
};
