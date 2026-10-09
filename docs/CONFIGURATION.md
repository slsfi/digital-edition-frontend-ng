# Project configuration reference

This reference describes the options in [`src/project/config.ts`](../src/project/config.ts), including the fields inside lists and mappings. Use the [project customization guide](PROJECT-CUSTOMIZATION.md) for the setup workflow and settings that also require changes to translations, build configuration, public files, or deployment.

Options are grouped in the same order as `config.ts`:

- [Using the configuration](#using-the-configuration)
- [Application settings](#application-settings-app)
- [Articles](#articles)
- [Collections](#collections)
- [Ebooks](#ebooks)
- [Page settings](#page-settings-page)
- [Component settings](#component-settings-component)
- [Modal settings](#modal-settings-modal)

## Using the configuration

The exported `config` object is compiled into the browser and server builds. Rebuild after changing it. Regenerate routes after feature/auth changes, and regenerate enabled sitemaps and static menus when their content or settings change; see [route generation](PROJECT-CUSTOMIZATION.md#feature-based-route-generation) and [generated public content](PROJECT-CUSTOMIZATION.md#generated-public-content).

The current `Config` type permits arbitrary keys and values; it does not validate this structure. Use the types described below and retain the surrounding objects when editing an option. The values shipped in `config.ts` include example edition data and are not universal defaults. Some consumers provide fallbacks when fields are missing, but these can differ between features.

In the tables, `boolean` means `true` or `false`, `string[]` means a list of strings, and `number[]` means a list of numbers. `[]` is an empty list; `{}` is an empty mapping. `<locale>`, `<collectionId>`, and other placeholders stand for actual keys in the configuration. Fields marked optional can be omitted from the relevant list entry.

Use public asset URLs such as `assets/images/banner.jpg` for files in `public/assets/images/`. The `public/` source directory is not part of the URL. Backend IDs, status codes, search fields, and image-size selectors must match the edition's backend data; a frontend option does not create that data. Keep credentials and secrets out of this file.

## Application settings (`app`)

| Option | Type / possible values | Description |
| --- | --- | --- |
| `app.siteURLOrigin` | `string`: absolute HTTP/HTTPS origin, such as `https://edition.example.org` | Public origin used for absolute page links, SEO metadata, downloads/printing, and sitemap generation. Use the public website origin, without a locale prefix. |
| `app.projectNameDB` | `string`: backend project name | Identifies the edition in digital-edition API paths. |
| `app.projectId` | `number`: backend project ID | Identifies the edition in named-entity and Elasticsearch queries. |
| `app.backendBaseURL` | `string`: absolute API base URL | Base for digital-edition content requests; services append the project name and endpoint. Use no trailing slash. |
| `app.alternateFacsimileBaseURL` | `string`: absolute image base URL, or `''` | Alternative facsimile host. Images use `<base>/<facsimileCollectionId>/<quality>/<imageNumber>.jpg`. An empty string uses the backend's facsimile endpoint. |
| `app.enableRouterLoadingBar` | `boolean` | Show the progress bar during router navigation. |

### Internationalization (`app.i18n`)

Keep interface languages aligned with `angular.json`, translation files, development launchers, and nginx's default locale. See [internationalization setup](PROJECT-CUSTOMIZATION.md#internationalization).

| Option | Type / possible values | Description |
| --- | --- | --- |
| `app.i18n.languages` | Array of language objects | Available interface languages, in language-menu order. Each entry has the fields below. |
| `app.i18n.languages[].code` | `string`: emitted locale code, such as `sv`, `fi`, or `en` | Language identifier used in application links and localized content requests. Must match an enabled Angular locale and its URL subpath. |
| `app.i18n.languages[].label` | `string` | Language name displayed in the language menu, usually in that language. |
| `app.i18n.languages[].region` | Optional `string`: region code, such as `FI` | Region used in Open Graph locale metadata, for example `sv_FI`. If omitted, the language code is also used as the region. |
| `app.i18n.defaultLanguage` | `string`: one of the configured interface-language codes | Default for unprefixed production requests and generated sitemap URLs; also used for the `hreflang` default. |
| `app.i18n.multilingualCollectionTableOfContents` | `boolean` | Request locale-specific collection information and tables of contents. Requires matching localized backend endpoints. |
| `app.i18n.multilingualReadingTextLanguages` | `string[]`: backend reading-text language codes, or `[]` | Reading-text versions available for parallel viewing. More than one entry enables language-specific reading-text views and download choices. These are content languages, which may differ from interface languages. |
| `app.i18n.multilingualNamedEntityData` | `boolean` | Request named-entity details in the active interface language. Requires localized backend entity data. |

### Authentication (`app.auth`)

| Option | Type / possible values | Description |
| --- | --- | --- |
| `app.auth.enabled` | `boolean` | Enable authentication routes, guards, and authenticated requests. Protected routes return CSR shells rather than protected SSR content. See [authentication](AUTHENTICATION.md) before enabling it. |
| `app.auth.backendAuthBaseURL` | `string`: absolute authentication API base URL, or `''` | Base to which the auth service appends `auth` and related endpoint paths. A trailing slash is normalized. When empty, the service uses the origin of `app.backendBaseURL`. |

### Social sharing (`app.openGraphMetaTags`)

| Option | Type / possible values | Description |
| --- | --- | --- |
| `app.openGraphMetaTags.enabled` | `boolean` | Generate Open Graph metadata for social sharing. |
| `app.openGraphMetaTags.image` | Object keyed by interface-language code | Per-language share-image settings. Each entry has `URL` and `altText`. |
| `app.openGraphMetaTags.image.<locale>.URL` | `string`: public image path, or `''` | Image path resolved beneath the locale's public website root, such as `assets/images/share.jpg`. An empty value falls back to the home-page banner URL. Use an asset path rather than an arbitrary external URL. |
| `app.openGraphMetaTags.image.<locale>.altText` | `string`, or `''` | Localized image description. An empty value falls back to the home-page banner's alt text. |

### Generators (`app.prebuild`)

These flags control generator behavior. A local production build generates routes, while Docker also invokes the sitemap and static-menu generators; see [generated public content](PROJECT-CUSTOMIZATION.md#generated-public-content) for commands and output locations.

| Option | Type / possible values | Description |
| --- | --- | --- |
| `app.prebuild.sitemap` | `boolean` | Generate `public/sitemap.txt` when the sitemap script runs. Authentication mode skips generation. |
| `app.prebuild.staticCollectionMenus` | `boolean` | Generate per-locale collection TOC HTML when the menu script runs, and enable use of that prebuilt content. Generation is skipped when auth or dynamic collection-menu SSR is enabled. |
| `app.prebuild.featureBasedRoutes` | `boolean` | Filter supported production routes using menus and content settings. `false` retains the canonical route set. See [feature-based route generation](PROJECT-CUSTOMIZATION.md#feature-based-route-generation); menu visibility alone is not access control. |

Turning off a generator does not remove files already present in `public/`; review existing output when changing these flags.

### Server rendering (`app.ssr`)

| Option | Type / possible values | Description |
| --- | --- | --- |
| `app.ssr.trustProxyHops` | `number`: non-negative integer | Maximum trusted proxy hops for resolving client IPs. Common values: `2` for HAProxy → nginx → Node, `1` for nginx → Node, and `0` for direct connections. The address list must also trust the proxies. |
| `app.ssr.trustedProxyAddresses` | `string[]`: IP addresses, CIDRs, or Express named ranges `loopback`, `linklocal`, `uniquelocal` | Addresses trusted to forward client IPs and origin information. The shipped list trusts these three named ranges. `[]` disables proxy trust. |
| `app.ssr.collectionSideMenu` | `boolean` | Render the collection side menu dynamically during SSR. When `false`, prebuilt menu HTML can be used if enabled. Dynamic SSR skips static-menu generation. |

Both the hop limit and address list apply. The immediate peer must be trusted before its forwarded host/protocol headers are accepted. See [SSR and proxy settings](PROJECT-CUSTOMIZATION.md#ssr-and-proxy-settings) for deployment guidance and [Express's proxy reference](https://expressjs.com/en/guide/behind-proxies/) for address/range syntax.

## Articles

`articles` is an array of article objects. Use `[]` when the edition has none. Each entry describes one localized article; versions in different languages share an `id` and can have different `routeName` values. The backend supplies the Markdown content.

| Field | Type / possible values | Description |
| --- | --- | --- |
| `articles[].id` | `string`: backend article node ID | Stable ID connecting localized versions of the same article. |
| `articles[].language` | `string`: interface-language code | Language of this article entry. |
| `articles[].routeName` | `string`: URL segment | Public route under `/article/<routeName>`. Use a URL-safe name without surrounding slashes. |
| `articles[].title` | Optional `string` | Override the article's menu/content-grid title. |
| `articles[].coverURL` | Optional `string`: public image URL/path | Cover image for the article's content-grid card. |
| `articles[].enableTOC` | Optional `boolean` | Enable the heading-based article TOC; enabled when omitted. |
| `articles[].downloadOptions` | Optional array of download objects | Download links. The article toolbar currently uses the first entry when `page.article.showTextDownloadButton` is enabled. |
| `articles[].downloadOptions[].url` | `string`: public file URL/path | Download target, such as `assets/files/article.pdf`. |
| `articles[].downloadOptions[].label` | Optional `string` | Label stored with the download link; the article toolbar currently uses its translated download label. |

Example:

```ts
articles: [
  {
    id: "01",
    language: "sv",
    routeName: "om-utgavan",
    title: "Om utgåvan",
    coverURL: "assets/images/about.jpg",
    enableTOC: true,
    downloadOptions: [{ url: "assets/files/about.pdf", label: "PDF" }]
  },
  { id: "01", language: "fi", routeName: "tietoa-julkaisusta" }
]
```

## Collections

| Option | Type / possible values | Description |
| --- | --- | --- |
| `collections.addTEIClassNames` | `boolean` | Add shared TEI CSS classes to processed reading texts, manuscripts, and variants so the shared TEI styles apply. |
| `collections.replaceImageAssetsPaths` | `boolean` | Rewrite `src="images/..."` references in processed content to `src="assets/images/..."`. |
| `collections.enableLegacyIDs` | `boolean` | Resolve legacy collection/publication IDs through the backend for legacy links and references. |
| `collections.enableMathJax` | `boolean` | Enable browser MathJax typesetting for text content. Requires a compatible MathJax script exposing `MathJax.Hub` in `src/index.html`. |
| `collections.firstTextItem` | Object mapping collection IDs to `string` text-item IDs | Fallback destination when a collection has no enabled front-matter page. IDs use `<collectionId>_<publicationId>` with an optional chapter suffix, such as `216_20280` or `218_20230_ch2`. |
| `collections.firstTextItem.<collectionId>` | `string`: text-item ID | Initial reading-text destination for that collection. |
| `collections.highlightSearchMatches` | `boolean` | Carry search-match information into collection text pages opened from search results so matches can be highlighted. |
| `collections.inlineIllustrations` | `number[]`: collection IDs | Collections whose reading-text illustrations remain visible inline. Other collections' illustration elements are hidden inline. |
| `collections.mediaCollectionMappings` | Object mapping collection IDs to `number` gallery IDs | Connect reading-text illustrations to backend media collections. |
| `collections.mediaCollectionMappings.<collectionId>` | `number`: backend gallery/media-collection ID | Gallery used when constructing that collection's illustration URLs. |
| `collections.order` | `number[][]`: ordered groups of collection IDs, or `[]` | Select and order collections. Inner arrays define groups in the main menu; flattened order is used by the content grid and generators. |

Use numbers in `order`, `inlineIllustrations`, and the exclusion lists below. Object keys in `firstTextItem` and `mediaCollectionMappings` represent collection IDs. An empty `order` selects no collections for the main menu, content grid, or generators. Menu group titles come from the `MainSideMenu.CollectionsGroup1` through `MainSideMenu.CollectionsGroup5` translations.

Example:

```ts
order: [[216, 219], [220]],
firstTextItem: { 216: "216_20280", 219: "219_19443" },
mediaCollectionMappings: { 216: 44 }
```

### Front-matter pages

`collections.frontMatterPages` enables each page type globally. `collections.frontMatterPageDisabled` excludes individual collections from an otherwise enabled type. These flags affect navigation and supported route generation; they do not provide authorization.

| Option | Type / possible values | Description |
| --- | --- | --- |
| `collections.frontMatterPages.cover` | `boolean` | Enable collection cover pages. |
| `collections.frontMatterPages.title` | `boolean` | Enable collection title pages. |
| `collections.frontMatterPages.foreword` | `boolean` | Enable collection foreword pages. |
| `collections.frontMatterPages.introduction` | `boolean` | Enable collection introduction pages. |
| `collections.frontMatterPageDisabled.cover` | `number[]`: collection IDs | Omit the cover page for these collections. |
| `collections.frontMatterPageDisabled.title` | `number[]`: collection IDs | Omit the title page for these collections. |
| `collections.frontMatterPageDisabled.foreword` | `number[]`: collection IDs | Omit the foreword page for these collections. |
| `collections.frontMatterPageDisabled.introduction` | `number[]`: collection IDs | Omit the introduction page for these collections. |

## Ebooks

`ebooks` is an array of ebook objects. Use `[]` when the edition has none. The current ebook page displays PDFs; other formats such as EPUB can be provided as download links.

| Field | Type / possible values | Description |
| --- | --- | --- |
| `ebooks[].title` | `string` | Title in navigation and the ebook page. |
| `ebooks[].filename` | `string`: filename with extension | Ebook identifier used to construct `/ebook/<extension>/<name>` routes. For a local PDF, place this file in `public/assets/ebooks/`. |
| `ebooks[].collectionId` | Optional `number`: backend collection ID | Connect PDF search hits from that collection to this ebook route. |
| `ebooks[].externalFileURL` | Optional `string`: absolute file URL, or `''` | Load the PDF from this URL instead of `assets/ebooks/<filename>`. The external host must allow browser access. |
| `ebooks[].coverURL` | Optional `string`: public image URL/path, or `''` | Cover image for the ebook's content-grid card. |
| `ebooks[].downloadOptions` | Optional array of download objects | Links presented in the PDF download menu. |
| `ebooks[].downloadOptions[].url` | `string`: public file URL/path | Download target; can offer PDF, EPUB, or another available format. |
| `ebooks[].downloadOptions[].label` | Optional `string` | Display label, such as `PDF` or `EPUB`. |

Example:

```ts
ebooks: [
  {
    title: "Edition PDF",
    filename: "edition.pdf",
    coverURL: "assets/images/ebook-cover.jpg",
    downloadOptions: [
      { url: "assets/ebooks/edition.pdf", label: "PDF" },
      { url: "assets/ebooks/edition.epub", label: "EPUB" }
    ]
  }
]
```

## Page settings (`page`)

### About and articles

| Option | Type / possible values | Description |
| --- | --- | --- |
| `page.about.initialPageNode` | `string`: backend about-page node suffix, such as `01-01` | About page opened by the top-menu button. The app prefixes this value with `03-`, so `01-01` becomes `03-01-01`. |
| `page.article.showTextDownloadButton` | `boolean` | Show the article download button using the article's first `downloadOptions` entry. Supply a valid download URL. |
| `page.article.showURNButton` | `boolean` | Show the reference/URN button on article pages. |

### Search (`page.elasticSearch`)

These settings configure the Elasticsearch-backed search page. Search indices, fields, type codes, and query objects must match the backend's index mappings.

| Option | Type / possible values | Description |
| --- | --- | --- |
| `page.elasticSearch.enableFilters` | `boolean` | Show the faceted-search filter controls. Fixed query filters still apply when controls are hidden. |
| `page.elasticSearch.enableSortOptions` | `boolean` | Show search-result sorting controls. |
| `page.elasticSearch.filterGroupsOpenByDefault` | `string[]`: keys from `aggregations` | Filter groups initially expanded, such as `Years`, `Type`, `Genre`, and `Collection`. |
| `page.elasticSearch.hitsPerPage` | `number`: positive integer | Search-result page size. |
| `page.elasticSearch.indices` | `string[]`: Elasticsearch index names | Indices requested through the edition's search API. |
| `page.elasticSearch.openReadingTextWithComments` | `boolean` | Include the comments view when opening a reading-text hit from search results. |
| `page.elasticSearch.textHighlightFragmentSize` | `number`: non-negative integer | Requested highlighted body-text fragment length in characters. For the `unified` sentence scanner, `0` keeps sentences unsplit. |
| `page.elasticSearch.textHighlightType` | `string`: `fvh`, `unified`, or `plain` for ordinary text fields | Elasticsearch highlighter for body text. Must be compatible with the backend's field mapping. |
| `page.elasticSearch.textTitleHighlightType` | `string`: `fvh`, `unified`, or `plain` for ordinary text fields | Elasticsearch highlighter for titles; titles are requested without fragment splitting. |
| `page.elasticSearch.typeFilterGroupOptions` | `string[]`: backend text-type codes, or `[]` | Text types included in all searches and aggregation queries. Common codes: `est` (reading text), `com` (comments), `var` (variants), `inl` (introduction), `tit` (title), `fore` (foreword), `ms` (manuscript), and `pdf`. Empty means no fixed text-type restriction. |
| `page.elasticSearch.fixedFilters` | Array of Elasticsearch query objects, or `[]` | Query clauses added to every search and aggregation query, for example restricting deleted/published records. |
| `page.elasticSearch.fixedFilters[].terms` | Object mapping indexed field names to value arrays | The shipped filters use Elasticsearch `terms` clauses. Other supported query clauses can be used when the backend accepts them. |
| `page.elasticSearch.fixedFilters[].terms.deleted` | Array of indexed values, such as `["0"]` | Restrict the backend's deletion-status field. Match the index's actual value type. |
| `page.elasticSearch.fixedFilters[].terms.published` | Array of indexed values, such as `["2"]` | Restrict the backend's publication-status field. Match the index's actual value type. |
| `page.elasticSearch.additionalSourceFields` | `string[]`: indexed field paths | Extra `_source` fields returned with hits, in addition to those required by the application. |
| `page.elasticSearch.aggregations` | Object mapping filter-group names to Elasticsearch aggregation definitions | Define the search facets. Definitions used by the UI return `terms` or `date_histogram` buckets. |

The `fvh` highlighter requires term vectors with positions and offsets in the index. See [Elasticsearch highlighting](https://www.elastic.co/docs/reference/elasticsearch/rest-apis/highlighting) for supported highlighters and field requirements, and [highlighting settings](https://www.elastic.co/docs/reference/elasticsearch/rest-apis/highlighting-settings) for fragment behavior.

#### Aggregation definitions

The shipped filter groups are listed below. Each name is a key in `page.elasticSearch.aggregations` and can also appear in `filterGroupsOpenByDefault`.

| Group | Type | Indexed field / purpose |
| --- | --- | --- |
| `Years` | `date_histogram` | `orig_date_sort`: original publication dates grouped by year; used by the year-range control. |
| `Type` | `terms` | `text_type`: content types. |
| `Genre` | `terms` | `publication_data.genre.keyword`: publication genres. |
| `Collection` | `terms` | `publication_data.collection_name.keyword`: collection names. |
| `LetterSenderName` | `terms` | `sender_subject_name.keyword`: letter senders. |
| `LetterReceiverName` | `terms` | `receiver_subject_name.keyword`: letter recipients. |
| `LetterSenderLocation` | `terms` | `sender_location_name.keyword`: sending locations. |
| `LetterReceiverLocation` | `terms` | `receiver_location_name.keyword`: receiving locations. |

For each group, `<group>` below stands for its key. Keep `Years` as a year histogram with year-formatted labels when using the existing year-range UI.

| Field | Type / possible values | Description |
| --- | --- | --- |
| `page.elasticSearch.aggregations.<group>.terms` | Object | Term-bucket definition for a categorical filter. |
| `page.elasticSearch.aggregations.<group>.terms.field` | `string`: indexed field path | Field whose distinct values form the filter choices; usually a keyword field. |
| `page.elasticSearch.aggregations.<group>.terms.size` | `number`: positive integer | Maximum number of term buckets returned. |
| `page.elasticSearch.aggregations.<group>.terms.order` | Optional object mapping sort keys to `"asc"` or `"desc"` | Elasticsearch bucket ordering. The shipped groups that specify an order use `_key`. |
| `page.elasticSearch.aggregations.<group>.terms.order._key` | `string`: `"asc"` or `"desc"` | Order buckets by their value. Without this setting, the UI sorts categorical choices alphabetically. |
| `page.elasticSearch.aggregations.<group>.date_histogram` | Object | Date-bucket definition; used for `Years`. |
| `page.elasticSearch.aggregations.<group>.date_histogram.field` | `string`: indexed date field | Date used to build histogram buckets. |
| `page.elasticSearch.aggregations.<group>.date_histogram.calendar_interval` | `string`: Elasticsearch calendar interval, such as `"year"` | Calendar unit for the buckets. The app's year-range UI expects `"year"`. |
| `page.elasticSearch.aggregations.<group>.date_histogram.format` | `string`: Elasticsearch date format, such as `"yyyy"` | Bucket-label format. Use `"yyyy"` for the existing year-range UI. |

These definitions are sent to Elasticsearch through the backend. See the [date-histogram reference](https://www.elastic.co/docs/reference/aggregations/search-aggregations-bucket-datehistogram-aggregation) for interval/format syntax. Additional DSL options depend on the backend's Elasticsearch version and the UI's expected bucket shape.

### Foreword

| Option | Type / possible values | Description |
| --- | --- | --- |
| `page.foreword.showURNButton` | `boolean` | Show the foreword reference/URN button. |
| `page.foreword.showViewOptionsButton` | `boolean` | Show the foreword display-options button. |

### Home (`page.home`)

| Option | Type / possible values | Description |
| --- | --- | --- |
| `page.home.bannerImage.altTexts` | Object mapping locale codes to strings | Localized descriptions of the banner image. |
| `page.home.bannerImage.altTexts.<locale>` | `string` | Banner alt text for that interface language; also a fallback for share-image alt text. |
| `page.home.bannerImage.intrinsicSize.height` | `number` (positive pixel height) or `null` | Intrinsic image height for the `<img>` element. `null` omits the attribute. |
| `page.home.bannerImage.intrinsicSize.width` | `number` (positive pixel width) or `null` | Intrinsic image width for the `<img>` element. `null` omits the attribute. |
| `page.home.bannerImage.orientationPortrait` | `boolean` | Select the portrait-image home layout. `false` uses the landscape layout. |
| `page.home.bannerImage.alternateSources` | Array of source objects, or `[]` | Responsive image sources, in `<picture>` order. Empty uses the banner URL directly. Source fields are described below. |
| `page.home.bannerImage.URL` | `string`: public image URL/path | Banner image, fallback image for `<picture>`, and default share image. |
| `page.home.portraitOrientationSettings.imagePlacement.onRight` | `boolean` | Place the portrait image to the right in the layout. |
| `page.home.portraitOrientationSettings.imagePlacement.squareCroppedVerticalOffset` | `string`: CSS vertical `object-position` value, such as `"10%"`, `"center"`, or `''` | Vertical position of the portrait image when cropped; combined with a horizontal position of `50%`. Empty uses the stylesheet's position. |
| `page.home.portraitOrientationSettings.siteTitleOnImageOnSmallScreens` | `boolean` | Overlay the site title/subtitle on the portrait image on small screens. |
| `page.home.showContentGrid` | `boolean` | Show content cards on the home page; configure their content under `component.contentGrid`. |
| `page.home.showFooter` | `boolean` | Show the backend Markdown footer. |
| `page.home.showSearchbar` | `boolean` | Show the home-page search bar linking to the search page. Keep the search route enabled if using it. |

Each `alternateSources` entry can contain these HTML `<source>` attributes:

| Field | Type / possible values | Description |
| --- | --- | --- |
| `page.home.bannerImage.alternateSources[].srcset` | `string`: HTML source-set value | Image URL(s) with optional width/density descriptors. |
| `page.home.bannerImage.alternateSources[].media` | Optional `string`: CSS media query | Condition under which this source applies. |
| `page.home.bannerImage.alternateSources[].sizes` | Optional `string`: HTML sizes value | Display-size hints for a width-based source set. |
| `page.home.bannerImage.alternateSources[].type` | Optional `string`: image MIME type | Format hint, such as `image/webp`. |
| `page.home.bannerImage.alternateSources[].height` | Optional positive `number` | Intrinsic height of this source. |
| `page.home.bannerImage.alternateSources[].width` | Optional positive `number` | Intrinsic width of this source. |

Example:

```ts
alternateSources: [
  { media: "(max-width: 600px)", srcset: "assets/images/banner-small.webp", type: "image/webp" },
  { srcset: "assets/images/banner-large.webp", type: "image/webp" }
]
```

### Named-entity indexes (`page.index`)

| Option | Type / possible values | Description |
| --- | --- | --- |
| `page.index.keywords.maxFetchSize` | `number`: positive integer, capped at `10000` | Keyword records requested per fetch. |
| `page.index.keywords.showFilter` | `boolean` | Show keyword-index filter controls. |
| `page.index.keywords.publishedStatus` | `number`: backend publication-status code | Status matched by keyword-index queries; also used as the minimum publication status in keyword occurrences. The shipped value is `2`. |
| `page.index.persons.database` | `string`: `"elastic"` or another string | `"elastic"` uses Elasticsearch for the person index. Other values select the direct backend person-list endpoint. |
| `page.index.persons.maxFetchSize` | `number`: positive integer, capped at `10000` | Person records requested per Elasticsearch fetch; the direct person-list endpoint loads its whole result. |
| `page.index.persons.showFilter` | `boolean` | Show person-index filter controls when the Elasticsearch source is used. |
| `page.index.persons.publishedStatus` | `number`: backend publication-status code | Status matched by Elasticsearch person-index queries; also used as the minimum publication status in person occurrences. |
| `page.index.places.maxFetchSize` | `number`: positive integer, capped at `10000` | Place records requested per fetch. |
| `page.index.places.showFilter` | `boolean` | Show place-index filter controls. |
| `page.index.places.publishedStatus` | `number`: backend publication-status code | Status matched by place-index queries; also used as the minimum publication status in place occurrences. |
| `page.index.works.publishedStatus` | `number`: backend publication-status code | Minimum publication status in work occurrences. The current work-index listing query does not use this setting. |

Status-code meanings come from the edition backend. Index visibility is selected by `component.mainSideMenu.items.indexKeywords`, `indexPersons`, `indexPlaces`, and `indexWorks`.

### Introduction

| Option | Type / possible values | Description |
| --- | --- | --- |
| `page.introduction.hasSeparateTOC` | `boolean` | Display the introduction's embedded TOC as a separate menu. Requires backend content containing a `<div data-id="content">` TOC block. |
| `page.introduction.showTextDownloadButton` | `boolean` | Show the introduction download button; available formats come from `modal.downloadTexts.introductionFormats`. |
| `page.introduction.showURNButton` | `boolean` | Show the introduction reference/URN button. |
| `page.introduction.showViewOptionsButton` | `boolean` | Show the introduction display-options button. |
| `page.introduction.viewOptions.personInfo` | `boolean` | Offer the person-annotation toggle in introduction display options. |
| `page.introduction.viewOptions.placeInfo` | `boolean` | Offer the place-annotation toggle. |
| `page.introduction.viewOptions.workInfo` | `boolean` | Offer the work-annotation toggle. |
| `page.introduction.viewOptions.paragraphNumbering` | `boolean` | Offer paragraph/line numbering. |
| `page.introduction.viewOptions.pageBreakEdition` | `boolean` | Offer printed-edition page numbers. |

These `viewOptions` flags control which toggles are offered, rather than their initial checked state. The introduction forces reading-text-only toggles such as comments, emendations, and original page numbers off.

### Media collection

| Option | Type / possible values | Description |
| --- | --- | --- |
| `page.mediaCollection.showURNButton` | `boolean` | Show the media-collection reference/URN button. |

### Collection texts (`page.text`)

| Option | Type / possible values | Description |
| --- | --- | --- |
| `page.text.defaultViews` | `string[]`: enabled view names | Views opened initially, in column order, when no URL/recent view selection applies. Use `readingtext`, `comments`, `facsimiles`, `manuscripts`, `variants`, `illustrations`, `legend`, or `metadata`. For multilingual reading texts, use `readingtext_<language>`, such as `readingtext_sv`. |
| `page.text.defaultViewOptions` | `string[]`: keys from `page.text.viewOptions`, or `[]` | Annotation/display flags initially switched on in the shared view-options state, such as `["comments", "personInfo"]`. This also affects pages using that shared state. |
| `page.text.showTextDownloadButton` | `boolean` | Show the collection-text download button. Formats are configured under `modal.downloadTexts`. |
| `page.text.showURNButton` | `boolean` | Show the collection-text reference/URN button. |
| `page.text.showViewOptionsButton` | `boolean` | Show the collection-text display-options button. |

Default views must be enabled for the collection. Disabled defaults are omitted; if none remain, the page falls back to the first enabled view. `showAll` is an add-all action, not an initial view. When multilingual defaults begin with a language-specific reading text, the active interface language's reading text is moved first when available.

#### Display-option controls (`page.text.viewOptions`)

Each boolean makes a toggle available in the display-options popover. Set initial checked flags in `page.text.defaultViewOptions` instead. The text's TEI markup and selected stylesheet bundles determine which annotations can be shown; see [TEI styles](THEMING.md#tei-styles).

| Option | Type / possible values | Description |
| --- | --- | --- |
| `page.text.viewOptions.comments` | `boolean` | Offer commentary-marker highlighting. |
| `page.text.viewOptions.personInfo` | `boolean` | Offer person-annotation highlighting. |
| `page.text.viewOptions.placeInfo` | `boolean` | Offer place-annotation highlighting. |
| `page.text.viewOptions.emendations` | `boolean` | Offer editorial-change highlighting. |
| `page.text.viewOptions.normalisations` | `boolean` | Offer normalization highlighting. |
| `page.text.viewOptions.workInfo` | `boolean` | Offer work-annotation highlighting. |
| `page.text.viewOptions.abbreviations` | `boolean` | Offer abbreviation highlighting. |
| `page.text.viewOptions.paragraphNumbering` | `boolean` | Offer paragraph/line numbers. |
| `page.text.viewOptions.pageBreakOriginal` | `boolean` | Offer original-source page numbers. |
| `page.text.viewOptions.pageBreakEdition` | `boolean` | Offer printed-edition page numbers. |

#### Variant options (`page.text.variantViewOptions`)

| Option | Type / possible values | Description |
| --- | --- | --- |
| `page.text.variantViewOptions.showVariationTypeOption` | `boolean` | Offer the variant-difference display selector. |
| `page.text.variantViewOptions.defaultVariationType` | `string`: `"all"`, `"sub"`, or `"none"` | Initially show all differences, substantial differences only, or no differences. Other values fall back to `"all"`. |

#### Available views and collection exclusions

`page.text.viewTypes` controls the add-view choices. `page.text.viewTypeDisabledCollections` excludes specific numeric collection IDs from each view. An enabled choice also needs corresponding backend content.

| Option | Type / possible values | Description |
| --- | --- | --- |
| `page.text.viewTypes.showAll` | `boolean` | Offer the desktop action that opens all enabled views. |
| `page.text.viewTypes.readingtext` | `boolean` | Offer reading-text views, with language-specific choices when configured. |
| `page.text.viewTypes.comments` | `boolean` | Offer the commentary view. |
| `page.text.viewTypes.facsimiles` | `boolean` | Offer facsimile images. |
| `page.text.viewTypes.manuscripts` | `boolean` | Offer manuscript/transcription views. |
| `page.text.viewTypes.variants` | `boolean` | Offer variant texts. |
| `page.text.viewTypes.illustrations` | `boolean` | Offer reading-text illustrations as a separate view. |
| `page.text.viewTypes.legend` | `boolean` | Offer the textual-symbols legend. |
| `page.text.viewTypes.metadata` | `boolean` | Offer publication metadata. |
| `page.text.viewTypeDisabledCollections.readingtext` | `number[]`: collection IDs | Disable reading-text choices for these collections. |
| `page.text.viewTypeDisabledCollections.comments` | `number[]`: collection IDs | Disable the comments view for these collections. |
| `page.text.viewTypeDisabledCollections.facsimiles` | `number[]`: collection IDs | Disable facsimiles for these collections. |
| `page.text.viewTypeDisabledCollections.manuscripts` | `number[]`: collection IDs | Disable manuscripts for these collections. |
| `page.text.viewTypeDisabledCollections.variants` | `number[]`: collection IDs | Disable variants for these collections. |
| `page.text.viewTypeDisabledCollections.illustrations` | `number[]`: collection IDs | Disable the illustrations view for these collections. |
| `page.text.viewTypeDisabledCollections.legend` | `number[]`: collection IDs | Disable the legend for these collections. |
| `page.text.viewTypeDisabledCollections.metadata` | `number[]`: collection IDs | Disable metadata for these collections. |

### Title page

| Option | Type / possible values | Description |
| --- | --- | --- |
| `page.title.loadContentFromMarkdown` | `boolean` | Load title-page content from backend Markdown instead of the title-text endpoint. |
| `page.title.showURNButton` | `boolean` | Show the title-page reference/URN button. |
| `page.title.showViewOptionsButton` | `boolean` | Show the title-page display-options button. |

## Component settings (`component`)

### Collection side menu

Unlike numeric collection-selection/exclusion lists, the sorting lists below use **string** IDs, because they are compared with collection IDs from the route.

| Option | Type / possible values | Description |
| --- | --- | --- |
| `component.collectionSideMenu.sortableCollectionsAlphabetical` | `string[]`: collection IDs, such as `["211"]` | Offer alphabetical TOC ordering by item text for these collections. |
| `component.collectionSideMenu.sortableCollectionsChronological` | `string[]`: collection IDs | Offer chronological TOC grouping by the backend item's `date` field. |
| `component.collectionSideMenu.sortableCollectionsCategorical` | `string[]`: collection IDs | Offer category-based TOC grouping using the sort keys below. |
| `component.collectionSideMenu.categoricalSortingPrimaryKey` | `string`: backend TOC-item field name | First-level category/grouping key, such as `date`. Set a valid field when enabling categorical sorting. |
| `component.collectionSideMenu.categoricalSortingSecondaryKey` | `string`: backend TOC-item field name, or `''` | Optional second-level category key. Empty omits secondary grouping. |

### Content grid

The grid is displayed when `page.home.showContentGrid` is enabled. Collection cards use `collections.order`; these options add other content or change presentation.

| Option | Type / possible values | Description |
| --- | --- | --- |
| `component.contentGrid.includeArticles` | `boolean` | Include articles for the active locale. Their entries can provide titles and cover images. |
| `component.contentGrid.includeEbooks` | `boolean` | Include configured ebooks. |
| `component.contentGrid.includeMediaCollection` | `boolean` | Include the media-collection entry. |
| `component.contentGrid.mediaCollectionCoverURL` | `string`: public image URL/path, or `''` | Cover image for that media-collection entry. |
| `component.contentGrid.mediaCollectionCoverAltTexts` | Object mapping locale codes to strings | Localized media-collection cover descriptions. |
| `component.contentGrid.mediaCollectionCoverAltTexts.<locale>` | `string` | Alt text for that language. |
| `component.contentGrid.showTitles` | `boolean` | Show card titles. |

### Facsimiles

| Option | Type / possible values | Description |
| --- | --- | --- |
| `component.facsimiles.imageQuality` | `number`: backend image-size selector, such as `4` | Size/quality variant requested for inline facsimiles. Use a value supported by the image backend; the frontend does not define a fixed range. `0` omits the size segment for the default backend endpoint. |
| `component.facsimiles.showTitle` | `boolean` | Show facsimile titles. |

### Main side menu

Each `component.mainSideMenu.items` flag enables a navigation group or link. Hiding a menu item alone leaves routes available when feature-based filtering is off. With filtering enabled, some flags also control supported production routes; see [route filtering](PROJECT-CUSTOMIZATION.md#feature-based-route-generation).

| Option | Type / possible values | Description |
| --- | --- | --- |
| `component.mainSideMenu.items.about` | `boolean` | Show the backend about-page tree. |
| `component.mainSideMenu.items.articles` | `boolean` | Show the configured article navigation. |
| `component.mainSideMenu.items.ebooks` | `boolean` | Show configured ebooks. |
| `component.mainSideMenu.items.collections` | `boolean` | Show collection navigation. |
| `component.mainSideMenu.items.mediaCollections` | `boolean` | Show the media-collection link. |
| `component.mainSideMenu.items.indexKeywords` | `boolean` | Show the keyword index. |
| `component.mainSideMenu.items.indexPersons` | `boolean` | Show the person index. |
| `component.mainSideMenu.items.indexPlaces` | `boolean` | Show the place index. |
| `component.mainSideMenu.items.indexWorks` | `boolean` | Show the work index. |
| `component.mainSideMenu.items.search` | `boolean` | Show the search link. |
| `component.mainSideMenu.items.cookiePolicy` | `boolean` | Show the cookie-policy link. |
| `component.mainSideMenu.items.termsOfUse` | `boolean` | Show terms of use; also show its link in login/registration. |
| `component.mainSideMenu.items.privacyPolicy` | `boolean` | Show the privacy-policy link; also show it in login/registration. |
| `component.mainSideMenu.items.accessibilityStatement` | `boolean` | Show the accessibility-statement link. |
| `component.mainSideMenu.defaultExpanded` | `boolean` | Initially expand menu groups rather than keeping them collapsed. |
| `component.mainSideMenu.ungroupArticles` | `boolean` | Put article entries directly in the menu rather than beneath their backend article-root group. |

### Manuscripts

| Option | Type / possible values | Description |
| --- | --- | --- |
| `component.manuscripts.showTitle` | `boolean` | Show manuscript titles, including titles in printable manuscript output. |
| `component.manuscripts.showNormalizedToggle` | `boolean` | Offer switching between the transcription with changes and its normalized text. Requires both backend versions. |
| `component.manuscripts.showOpenLegendButton` | `boolean` | Show the button for opening the textual-symbols legend. |

### Top menu and variants

| Option | Type / possible values | Description |
| --- | --- | --- |
| `component.topMenu.showAboutButton` | `boolean` | Show the About button using `page.about.initialPageNode`. |
| `component.topMenu.showContentButton` | `boolean` | Show the Content button. |
| `component.topMenu.showElasticSearchButton` | `boolean` | Show the search button. This also keeps search included when feature-based route filtering is enabled. |
| `component.topMenu.showLanguageButton` | `boolean` | Show the interface-language selector. |
| `component.variants.showOpenLegendButton` | `boolean` | Show the legend-opening button in variant views. |

## Modal settings (`modal`)

### Text downloads (`modal.downloadTexts`)

Each format group is an object whose supported format keys have boolean values:

| Option | Type | Description |
| --- | --- | --- |
| `modal.downloadTexts.introductionFormats` | Format-options object | Formats offered for introduction downloads. |
| `modal.downloadTexts.readingTextFormats` | Format-options object | Formats offered for reading-text downloads. |
| `modal.downloadTexts.commentsFormats` | Format-options object | Formats offered for commentary downloads. |
| `modal.downloadTexts.manuscriptsFormats` | Format-options object | Formats offered for manuscript downloads. |

For **each** group above, `<group>` below stands for its exact name, for example `readingTextFormats`. The same five options apply to all four groups:

| Option | Type / possible values | Description |
| --- | --- | --- |
| `modal.downloadTexts.<group>.xml` | `boolean` | Offer XML download. |
| `modal.downloadTexts.<group>.html` | `boolean` | Offer HTML download. |
| `modal.downloadTexts.<group>.xhtml` | `boolean` | Offer XHTML download. |
| `modal.downloadTexts.<group>.txt` | `boolean` | Offer plain-text download. |
| `modal.downloadTexts.<group>.print` | `boolean` | Offer printable output through the browser's print flow. |

File formats require backend support for the selected text type. The page download-button flags control access to this modal; format flags control its choices. An empty group offers no formats.

### Fullscreen images and references

| Option | Type / possible values | Description |
| --- | --- | --- |
| `modal.fullscreenImageViewer.imageQuality` | `number`: backend image-size selector | Size/quality variant for fullscreen facsimiles. Must be supported by the image backend. `0` or an omitted value uses `component.facsimiles.imageQuality`. |
| `modal.referenceData.URNResolverURL` | `string`: absolute resolver base URL, such as `https://urn.fi/` | Prefix added to backend URNs to create reference links. Include the separator required before the URN. |

### Named entities (`modal.namedEntity`)

These settings apply to details dialogs for persons, places, keywords, and works. A flag enables a field or data request; it does not add missing metadata to the backend.

| Option | Type / possible values | Description |
| --- | --- | --- |
| `modal.namedEntity.showAliasAndPrevLastName` | `boolean` | Show aliases and previous last names when supplied. |
| `modal.namedEntity.showArticleData` | `boolean` | Fetch and show articles associated with the entity. |
| `modal.namedEntity.showCityRegionCountry` | `boolean` | Show city, region, and country fields. |
| `modal.namedEntity.showDescriptionLabel` | `boolean` | Present the description as a labeled metadata field. `false` presents it as an unlabeled paragraph. |
| `modal.namedEntity.showGalleryOccurrences` | `boolean` | Fetch and show the entity's gallery occurrences. |
| `modal.namedEntity.showMediaData` | `boolean` | Fetch and show associated media data, such as an entity image. |
| `modal.namedEntity.showOccupation` | `boolean` | Show occupation beside the entity heading. |
| `modal.namedEntity.showOccurrences` | `boolean` | Show the text-occurrences accordion. Publication visibility follows the relevant `page.index.<type>.publishedStatus`. |
| `modal.namedEntity.showType` | `boolean` | Show the entity's type field. |
| `modal.namedEntity.useSimpleWorkMetadata` | `boolean` | Use simple backend work details instead of Elasticsearch manifestation metadata; also controls work-tooltip and occurrence metadata presentation. |
