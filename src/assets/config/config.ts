type Config = { [key: string]: any }

export const config: Config = {
  app: {
    siteURLOrigin: "https://testa-jansson.sls.fi",
    projectNameDB: "jansson",
    projectId: 1,
    backendBaseURL: "https://testa-jansson-auth-api.sls.fi/digitaledition",
    alternateFacsimileBaseURL: "",
    i18n: {
      languages: [
        { code: "sv", label: "Svenska", region: "FI" },
        { code: "en", label: "English", region: "GB" }
      ],
      defaultLanguage: "sv",
      multilingualCollectionTableOfContents: false,
      multilingualReadingTextLanguages: [],
      multilingualNamedEntityData: false
    },
    enableRouterLoadingBar: true,
    auth: {
      enabled: true
    },
    openGraphMetaTags: {
      enabled: true,
      image: {
        sv: {
          altText: "Svartvitt foto av en kvinna med kort hår och stickad tröja som sitter vid ett skrivbord, omgiven av papper och teckningar, och skriver under en bordslampa.",
          URL: "assets/images/home-page-banner.jpg"
        },
        en: {
          altText: "Black and white photo of a woman with short hair and a knitted sweater sitting at a desk, surrounded by papers and drawings, writing under a desk lamp.",
          URL: "assets/images/home-page-banner.jpg"
        }
      }
    },
    prebuild: {
      featureBasedRoutes: true,
      sitemap: false,
      staticCollectionMenus: false
    },
    ssr: {
	  trustProxyHops: 2,
      collectionSideMenu: false
    }
  },
  articles: [],
  collections: {
    addTEIClassNames: false,
    replaceImageAssetsPaths: false,
    enableLegacyIDs: false,
    enableMathJax: false,
    firstTextItem: { 1: "1_1" },
    frontMatterPages: {
      cover: false,
      title: false,
      foreword: false,
      introduction: false
    },
    frontMatterPageDisabled: {
      cover: [],
      title: [],
      foreword: [],
      introduction: []
    },
    highlightSearchMatches: true,
    inlineIllustrations: [],
    mediaCollectionMappings: {},
    order: [
      [1]
    ]
  },
  ebooks: [],
  page: {
    about: {
      initialPageNode: "01"
    },
    article: {
      showTextDownloadButton: false,
      showURNButton: false
    },
    elasticSearch: {
      enableFilters: true,
      enableSortOptions: true,
      filterGroupsOpenByDefault: ["Years", "Type", "Genre", "Collection"],
      hitsPerPage: 15,
      indices: ["jansson"],
      openReadingTextWithComments: false,
      textHighlightFragmentSize: 150,
      textHighlightType: "fvh",
      textTitleHighlightType: "fvh",
      typeFilterGroupOptions: ["est", "com", "var", "inl", "tit", "fore"],
      fixedFilters: [
        {
          terms: {
            deleted: ["0"]
          }
        },
        {
          terms: {
            published: ["2"]
          }
        }
      ],
      additionalSourceFields: [],
      aggregations: {
        Years: {
          date_histogram: {
            field: "orig_date_sort",
            calendar_interval: "year",
            format: "yyyy"
          }
        },
        Type: {
          terms: {
            field: "text_type",
            size: 40,
            order: {_key: "asc"}
          }
        },
        Genre: {
          terms: {
            field: "publication_data.genre.keyword",
            size: 40,
            order: {_key: "asc"}
          }
        },
        Collection: {
          terms: {
            field: "publication_data.collection_name.keyword",
            size: 40,
            order: {_key: "asc"}
          }
        },
        LetterSenderName: {
          terms: {
            field: "sender_subject_name.keyword",
            size: 100
          }
        },
        LetterReceiverName: {
          terms: {
            field: "receiver_subject_name.keyword",
            size: 100
          }
        },
        LetterSenderLocation: {
          terms: {
            field: "sender_location_name.keyword",
            size: 50
          }
        },
        LetterReceiverLocation: {
          terms: {
            field: "receiver_location_name.keyword",
            size: 50
          }
        }
      }
    },
    foreword: {
      showURNButton: true,
      showViewOptionsButton: true
    },
    home: {
      bannerImage: {
        altTexts: {
          sv: "",
          en: ""
        },
        intrinsicSize: {
          height: 1930,
          width: 3840
        },
        orientationPortrait: false,
        alternateSources: [
          {
            media: "(orientation: portrait) and (min-resolution: 2x)",
            srcset: "assets/images/tove-jansson-2574x2574.avif 2574w",
            type: "image/avif"
          },
          {
            media: "(orientation: portrait) and (min-resolution: 2x)",
            srcset: "assets/images/tove-jansson-2574x2574.jpg 2574w",
            type: "image/jpeg"
          },
          {
            media: "(orientation: portrait) and (max-height: 860px)",
            srcset: "assets/images/tove-jansson-1287x1287.avif 1287w",
            type: "image/avif"
          },
          {
            media: "(orientation: portrait) and (max-height: 860px)",
            srcset: "assets/images/tove-jansson-1287x1287.jpg 1287w",
            type: "image/jpeg"
          },
          {
            media: "(max-height: 965px) and (max-resolution: 1x)",
            srcset: "assets/images/tove-jansson-1920x965.avif 1920w",
            type: "image/avif"
          },
          {
            media: "(max-height: 965px) and (max-resolution: 1x)",
            srcset: "assets/images/tove-jansson-1920x965.jpg 1920w",
            type: "image/jpeg"
          },
          {
            media: "((max-height: 1287px) and (max-resolution: 1x)) or (max-height: 910px)",
            srcset: "assets/images/tove-jansson-2560x1287.avif 2560w",
            type: "image/avif"
          },
          {
            media: "((max-height: 1287px) and (max-resolution: 1x)) or (max-height: 910px)",
            srcset: "assets/images/tove-jansson-2560x1287.jpg 2560w",
            type: "image/jpeg"
          },
          {
            srcset: "assets/images/tove-jansson-3840x1930.avif 3840w",
            type: "image/avif"
          },
          {
            srcset: "assets/images/tove-jansson-3840x1930.jpg 3840w",
            type: "image/jpeg"
          }
        ],
        URL: "assets/images/tove-jansson-3840x1930.jpg"
      },
      portraitOrientationSettings: {
        imagePlacement: {
          onRight: false,
          squareCroppedVerticalOffset: "10%"
        },
        siteTitleOnImageOnSmallScreens: false
      },
      showContentGrid: false,
      showFooter: true,
      showSearchbar: false
    },
    index: {
      keywords: {
        maxFetchSize: 500,
        showFilter: true,
        publishedStatus: 2
      },
      persons: {
        database: "elastic",
        maxFetchSize: 500,
        showFilter: true,
        publishedStatus: 2
      },
      places: {
        maxFetchSize: 500,
        showFilter: true,
        publishedStatus: 2
      },
      works: {
        publishedStatus: 2
      }
    },
    introduction: {
      hasSeparateTOC: true,
      showTextDownloadButton: true,
      showURNButton: true,
      showViewOptionsButton: true,
      viewOptions: {
        personInfo: true,
        placeInfo: false,
        workInfo: true,
        paragraphNumbering: true,
        pageBreakEdition: true
      }
    },
    mediaCollection: {
      showURNButton: true
    },
    text: {
      defaultViews: ["readingtext", "facsimiles", "manuscripts"],
      defaultViewOptions: [],
      showTextDownloadButton: false,
      showURNButton: false,
      showViewOptionsButton: true,
      viewOptions: {
        comments: false,
        personInfo: false,
        placeInfo: false,
        emendations: true,
        normalisations: true,
        workInfo: false,
        abbreviations: true,
        paragraphNumbering: true,
        pageBreakOriginal: true,
        pageBreakEdition: false
      },
      variantViewOptions: {
        showVariationTypeOption: false,
        defaultVariationType: "all"
      },
      viewTypes: {
        showAll: true,
        readingtext: true,
        comments: false,
        facsimiles: true,
        manuscripts: true,
        variants: false,
        illustrations: false,
        legend: true,
        metadata: false
      },
      viewTypeDisabledCollections: {
        readingtext: [],
        comments: [],
        facsimiles: [],
        manuscripts: [],
        variants: [],
        illustrations: [],
        legend: [],
        metadata: []
      }
    },
    title: {
      loadContentFromMarkdown: false,
      showURNButton: true,
      showViewOptionsButton: true
    }
  },
  component: {
    collectionSideMenu: {
      sortableCollectionsAlphabetical: [],
      sortableCollectionsChronological: [],
      sortableCollectionsCategorical: [],
      categoricalSortingPrimaryKey: "",
      categoricalSortingSecondaryKey: ""
    },
    contentGrid: {
      includeArticles: false,
      includeEbooks: false,
      includeMediaCollection: false,
      mediaCollectionCoverURL: "",
      mediaCollectionCoverAltTexts: {
        sv: "Alt-text",
        en: "Alt-teksti"
      },
      showTitles: true
    },
    facsimiles: {
      imageQuality: 4,
      showTitle: true
    },
    mainSideMenu: {
      items: {
        about: true,
        articles: false,
        ebooks: false,
        collections: true,
        mediaCollections: false,
        indexKeywords: false,
        indexPersons: false,
        indexPlaces: false,
        indexWorks: false,
        search: true,
        cookiePolicy: true,
        privacyPolicy: true,
        termsOfUse: true,
        accessibilityStatement: false,
      },
      defaultExpanded: false,
      ungroupArticles: false
    },
    manuscripts: {
      showTitle: true,
      showNormalizedToggle: true,
      showOpenLegendButton: true
    },
    topMenu: {
      showAboutButton: false,
      showContentButton: true,
      showElasticSearchButton: true,
      showLanguageButton: true
    },
    variants: {
      showOpenLegendButton: true
    }
  },
  modal: {
    downloadTexts: {
      introductionFormats: {
        xml: true,
        html: false,
        xhtml: false,
        txt: false,
        print: true
      },
      readingTextFormats: {
        xml: true,
        html: false,
        xhtml: false,
        txt: false,
        print: true
      },
      commentsFormats: {
        xml: true,
        html: false,
        xhtml: false,
        txt: false,
        print: true
      },
      manuscriptsFormats: {
        xml: false,
        html: false,
        xhtml: false,
        txt: false,
        print: true
      }
    },
    fullscreenImageViewer: {
      imageQuality: 4
    },
    referenceData: {
      URNResolverURL: "https://urn.fi/",
    },
    namedEntity: {
      showAliasAndPrevLastName: false,
      showArticleData: false,
      showCityRegionCountry: false,
      showDescriptionLabel: false,
      showGalleryOccurrences: false,
      showMediaData: false,
      showOccupation: false,
      showOccurrences: true,
      showType: false,
      useSimpleWorkMetadata: false
    }
  }
}
