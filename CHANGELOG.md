## [1.21.2](https://github.com/JinnElements/jinn-tap/compare/v1.21.1...v1.21.2) (2025-05-04)


### Bug Fixes

* nodes with preserveSpace:true in the schema should be serialized with xml:space="preserve" ([f5e798e](https://github.com/JinnElements/jinn-tap/commit/f5e798ef32b13a1a0a944d6fa83ead82884a8761))
* test case for xml:space="preserve" ([de1d7e2](https://github.com/JinnElements/jinn-tap/commit/de1d7e21362d630b23141b75e99c1b688b08fd18))

## [1.21.1](https://github.com/JinnElements/jinn-tap/compare/v1.21.0...v1.21.1) (2025-05-04)


### Bug Fixes

* new document should reset metadata ([9e09362](https://github.com/JinnElements/jinn-tap/commit/9e09362f95f5f2a6234b72317c6d5936faa00811))

# [1.21.0](https://github.com/JinnElements/jinn-tap/compare/v1.20.0...v1.21.0) (2025-05-04)


### Features

* **demo:** add download button ([cbfb405](https://github.com/JinnElements/jinn-tap/commit/cbfb40520dbe1dfccc0949d3ec23ed2a0e7326f6))

# [1.20.0](https://github.com/JinnElements/jinn-tap/compare/v1.19.0...v1.20.0) (2025-05-04)


### Bug Fixes

* **footnotes:** select note when cmd-click on reference ([bc39f9c](https://github.com/JinnElements/jinn-tap/commit/bc39f9c3c6fc1119eda048dba59a977fdf529da9))
* new document creation ([d54b547](https://github.com/JinnElements/jinn-tap/commit/d54b5472e01f1152c8a34091e9de95f8ffc7bb99))


### Features

* merge content to and from TEI documents on the client, therefore no longer requiring a server ([2c3f614](https://github.com/JinnElements/jinn-tap/commit/2c3f614be75dba353b94955c20ec3ffc8e42636e))

# [1.19.0](https://github.com/JinnElements/jinn-tap/compare/v1.18.1...v1.19.0) (2025-05-04)


### Features

* add input rule >> for creating subdivision ([3109a0e](https://github.com/JinnElements/jinn-tap/commit/3109a0e072a48693af0beb668f95c0b38e5b58a6))

## [1.18.1](https://github.com/JinnElements/jinn-tap/compare/v1.18.0...v1.18.1) (2025-05-03)


### Bug Fixes

* **footnotes:** reference might be undefined ([7d9f3e1](https://github.com/JinnElements/jinn-tap/commit/7d9f3e1b114eb5acfc139745fb00cc2ce1b3859b))

# [1.18.0](https://github.com/JinnElements/jinn-tap/compare/v1.17.0...v1.18.0) (2025-05-03)


### Features

* **footnotes:** support n attribute for note reference ([2886589](https://github.com/JinnElements/jinn-tap/commit/2886589eec1a00239e8f56ac8f64aa41225e902c))

# [1.17.0](https://github.com/JinnElements/jinn-tap/compare/v1.16.2...v1.17.0) (2025-05-03)


### Features

* allow notes without anchor ([0b2914e](https://github.com/JinnElements/jinn-tap/commit/0b2914ed6b31b4062e85a9c55694ef45fbdacb67))

## [1.16.2](https://github.com/JinnElements/jinn-tap/compare/v1.16.1...v1.16.2) (2025-05-02)


### Bug Fixes

* **schema:** allow head in figure ([c6df156](https://github.com/JinnElements/jinn-tap/commit/c6df156cbb1afe44bd8744364bfcec187dd753ba))

## [1.16.1](https://github.com/JinnElements/jinn-tap/compare/v1.16.0...v1.16.1) (2025-05-02)


### Bug Fixes

* **jinn-toast:** CSS classname conflict ([9e2291d](https://github.com/JinnElements/jinn-tap/commit/9e2291d2b15b22cb0158568fa82c4ed353540af4))

# [1.16.0](https://github.com/JinnElements/jinn-tap/compare/v1.15.0...v1.16.0) (2025-05-01)


### Bug Fixes

* **collaboration:** allow nickname to be changed ([c77f2a0](https://github.com/JinnElements/jinn-tap/commit/c77f2a0694235a0dae3b974b4656625bbc3e96e3))


### Features

* **collab-server:** check for allowed group ([41aa6b1](https://github.com/JinnElements/jinn-tap/commit/41aa6b1d86dbea120a00e578d7d111affe0961ad))

# [1.15.0](https://github.com/JinnElements/jinn-tap/compare/v1.14.1...v1.15.0) (2025-04-30)


### Bug Fixes

* **collaboration:** adding footnotes failed ([354b851](https://github.com/JinnElements/jinn-tap/commit/354b85166deade012081e09731d9d131a479950a))


### Features

* **collaboration:** prepare jwt token auth ([8c9b8cb](https://github.com/JinnElements/jinn-tap/commit/8c9b8cbf777e985118d82135b1f96a1647a465bc))

## [1.14.1](https://github.com/JinnElements/jinn-tap/compare/v1.14.0...v1.14.1) (2025-04-29)


### Bug Fixes

* **collaboration:** navigator and attribute panel should not react to y-sync transactions ([5499600](https://github.com/JinnElements/jinn-tap/commit/54996009d152c73c8dfe2963812e9b3f20f6f375))
* emit content-change event only if document actually changed ([cc3557b](https://github.com/JinnElements/jinn-tap/commit/cc3557b2740002a889070db5f480df1c4d229002))
* make the distinction between local and remote transaction more robust ([6b1f287](https://github.com/JinnElements/jinn-tap/commit/6b1f28716ff7a310bbd25cb0f5c5d2a7f097835b))

# [1.14.0](https://github.com/JinnElements/jinn-tap/compare/v1.13.6...v1.14.0) (2025-04-28)


### Features

* add toggle button to show/hide XML source ([263fc65](https://github.com/JinnElements/jinn-tap/commit/263fc65f285d747968e4444f6f65c52496619788))

## [1.13.6](https://github.com/JinnElements/jinn-tap/compare/v1.13.5...v1.13.6) (2025-04-28)


### Bug Fixes

* **AttributePanel:** more compact styling ([48b9f9b](https://github.com/JinnElements/jinn-tap/commit/48b9f9bc466f86429d525166edf5393a52089505))

## [1.13.5](https://github.com/JinnElements/jinn-tap/compare/v1.13.4...v1.13.5) (2025-04-28)


### Bug Fixes

* overlay not visible ([33c0c45](https://github.com/JinnElements/jinn-tap/commit/33c0c45b74fc685b199780fdc03c36a3d74d68c1))

## [1.13.4](https://github.com/JinnElements/jinn-tap/compare/v1.13.3...v1.13.4) (2025-04-28)


### Bug Fixes

* updating breadcrumbs and attributes ([07869c2](https://github.com/JinnElements/jinn-tap/commit/07869c26eec53696649656c6552b599bd6041f7b))

## [1.13.3](https://github.com/JinnElements/jinn-tap/compare/v1.13.2...v1.13.3) (2025-04-28)


### Bug Fixes

* initial selection in collab mode ([32cc89e](https://github.com/JinnElements/jinn-tap/commit/32cc89e0dea142ecbb3e0799f7dcedf2a889bacf))

## [1.13.2](https://github.com/JinnElements/jinn-tap/compare/v1.13.1...v1.13.2) (2025-04-28)


### Bug Fixes

* **NavigationPanel:** correct selection of nodes if cursor is positioned at the very end ([365c54a](https://github.com/JinnElements/jinn-tap/commit/365c54aa67ae9415f3ecf3592731466ab65dda12))

## [1.13.1](https://github.com/JinnElements/jinn-tap/compare/v1.13.0...v1.13.1) (2025-04-28)


### Bug Fixes

* prevent loading of remote document twice; assign random username ([1a9fe59](https://github.com/JinnElements/jinn-tap/commit/1a9fe59746da39e69bd1b4e2c0af77100ca184df))

# [1.13.0](https://github.com/JinnElements/jinn-tap/compare/v1.12.3...v1.13.0) (2025-04-28)


### Bug Fixes

* **editor-styles:** do not show margin-top for first head in first div ([22dfbf6](https://github.com/JinnElements/jinn-tap/commit/22dfbf6d9007055b8af401dbfec3c761cad84aa1))
* **NavigationPanel:** create node selection ([a1be550](https://github.com/JinnElements/jinn-tap/commit/a1be5502ba7efd600e7cbdb0a042f6bf9e72528e))


### Features

* support multi-user collaboration if configured ([dc4890b](https://github.com/JinnElements/jinn-tap/commit/dc4890b15d1261a6c1a4ff1b57d75e80d070d680))

## [1.12.3](https://github.com/JinnElements/jinn-tap/compare/v1.12.2...v1.12.3) (2025-04-25)


### Bug Fixes

* **footnotes:** scroll added note into view ([b50aa29](https://github.com/JinnElements/jinn-tap/commit/b50aa29b087ff249d6f36174ba8f08c7907e607c))

## [1.12.2](https://github.com/JinnElements/jinn-tap/compare/v1.12.1...v1.12.2) (2025-04-25)


### Bug Fixes

* if notes should be wrapped in listAnnotation or noteGrp is now configurable ([1a2d428](https://github.com/JinnElements/jinn-tap/commit/1a2d428868781e6cc986f89f2acc08c37962b222))

## [1.12.1](https://github.com/JinnElements/jinn-tap/compare/v1.12.0...v1.12.1) (2025-04-24)


### Bug Fixes

* toolbar ordering ([9ee63ab](https://github.com/JinnElements/jinn-tap/commit/9ee63ab12ae269e433eb059f0ba95d2512e62ca9))

# [1.12.0](https://github.com/JinnElements/jinn-tap/compare/v1.11.0...v1.12.0) (2025-04-24)


### Bug Fixes

* do not show bar above footnotes if empty ([c7477ae](https://github.com/JinnElements/jinn-tap/commit/c7477aea3fff05c9afe427682ae142b3dfcecf63))


### Features

* add jinn-toast for messages ([e772a8d](https://github.com/JinnElements/jinn-tap/commit/e772a8db8a6bc3b2e1b1eced136ce069cfbc7bf2))

# [1.11.0](https://github.com/JinnElements/jinn-tap/compare/v1.10.1...v1.11.0) (2025-04-23)


### Features

* add toolbar button "clear formatting" ([41575c2](https://github.com/JinnElements/jinn-tap/commit/41575c2d400dd6c4bbe58a028207f49d9447bbb4))

## [1.10.1](https://github.com/JinnElements/jinn-tap/compare/v1.10.0...v1.10.1) (2025-04-23)


### Bug Fixes

* use listAnnotation instead of noteGrp for footnotes ([7ac3a96](https://github.com/JinnElements/jinn-tap/commit/7ac3a96b41d6297e75948caad59923c301791b1f))

# [1.10.0](https://github.com/JinnElements/jinn-tap/compare/v1.9.3...v1.10.0) (2025-04-23)


### Bug Fixes

* always show division markers to avoid confusion ([62f2069](https://github.com/JinnElements/jinn-tap/commit/62f2069b7f0f14a0bf725d1f3aabc88187c80966))
* highlighting occurrences ([f82beb2](https://github.com/JinnElements/jinn-tap/commit/f82beb28c6a9052972c8a3a26945ef1738e66c1c))


### Features

* add optional shortcodes for headings and lists ([9116659](https://github.com/JinnElements/jinn-tap/commit/9116659a5309ee25a0354803adca5e82625cb16e))

## [1.9.3](https://github.com/JinnElements/jinn-tap/compare/v1.9.2...v1.9.3) (2025-04-22)


### Bug Fixes

* authority lookup initialization ([08e02a8](https://github.com/JinnElements/jinn-tap/commit/08e02a8088c3d402325396bc4026406fc9f23320))

## [1.9.2](https://github.com/JinnElements/jinn-tap/compare/v1.9.1...v1.9.2) (2025-04-22)


### Bug Fixes

* choice/abbr/expan broken by toolbar refactoring ([b6c1665](https://github.com/JinnElements/jinn-tap/commit/b6c16658d85bf148b6666a2bcdfa9239958c8e68))

## [1.9.1](https://github.com/JinnElements/jinn-tap/compare/v1.9.0...v1.9.1) (2025-04-22)


### Bug Fixes

* make empty nodes selectable ([5ebd143](https://github.com/JinnElements/jinn-tap/commit/5ebd14362c70aa83c3363bf5789191f527f8d247))

# [1.9.0](https://github.com/JinnElements/jinn-tap/compare/v1.8.1...v1.9.0) (2025-04-22)


### Features

* support figure/graphic/figDesc ([f267414](https://github.com/JinnElements/jinn-tap/commit/f267414f0315bd96dc98b8ed7a7d5a8cd66d614f))

## [1.8.1](https://github.com/JinnElements/jinn-tap/compare/v1.8.0...v1.8.1) (2025-04-21)


### Bug Fixes

* styling improvements ([03f0f13](https://github.com/JinnElements/jinn-tap/commit/03f0f13b954224e3ed4a287cb2eed28e0fc6b051))

# [1.8.0](https://github.com/JinnElements/jinn-tap/compare/v1.7.1...v1.8.0) (2025-04-21)


### Bug Fixes

* correct serialization of nested marks ([006e0aa](https://github.com/JinnElements/jinn-tap/commit/006e0aaf7931a641ef0346f5879dbab775a12af8))
* order toolbar buttons ([ff73c48](https://github.com/JinnElements/jinn-tap/commit/ff73c483331fba101855691a15b57568dcc240ef))


### Features

* add gap/supplied/unclear/choice/abbr/expan ([b04fe28](https://github.com/JinnElements/jinn-tap/commit/b04fe2896dfcc61d1a3425768b45684dc529a536))
* add support for inserting snippets with placeholders; add choice/abbr/expan ([80b4414](https://github.com/JinnElements/jinn-tap/commit/80b4414676e0fd101e91def29b3b25b36b34ea32))

## [1.7.1](https://github.com/JinnElements/jinn-tap/compare/v1.7.0...v1.7.1) (2025-04-18)


### Bug Fixes

* check type of data loaded from url ([efd2292](https://github.com/JinnElements/jinn-tap/commit/efd229259911151202e187f93654a6c58ab0cd06))
* test configuration ([cdbbd1a](https://github.com/JinnElements/jinn-tap/commit/cdbbd1a6538abbca276b47fc8144cb2c81f016a8))

# [1.7.0](https://github.com/JinnElements/jinn-tap/compare/v1.6.0...v1.7.0) (2025-04-18)


### Features

* also support open attribute values using datalist ([84ec945](https://github.com/JinnElements/jinn-tap/commit/84ec94505a11698a1f0338f64a1c49cb082bf8d2))
* support dynamic loading of the schema ([0220465](https://github.com/JinnElements/jinn-tap/commit/0220465eaa108fc7e2eb6d86512e669788758dbb))

# [1.6.0](https://github.com/JinnElements/jinn-tap/compare/v1.5.0...v1.6.0) (2025-04-17)


### Bug Fixes

* applying attribute changes to higher level blocks ([49e848a](https://github.com/JinnElements/jinn-tap/commit/49e848abad30f1eef94ea8dafd9172d2fd8b5221))
* **navigator:** fix selection of high-level blocks ([04075a4](https://github.com/JinnElements/jinn-tap/commit/04075a4bc7ab4242fd9964f7d53abb7ed591fc72))


### Features

* add command to move up a division into its parent ([cd9e6f4](https://github.com/JinnElements/jinn-tap/commit/cd9e6f4a8cfbbac5dc2ef9ce09ddde2ce228bfe7))

# [1.5.0](https://github.com/JinnElements/jinn-tap/compare/v1.4.0...v1.5.0) (2025-04-16)


### Features

* add input rules for en and em dash ([8b5a2b5](https://github.com/JinnElements/jinn-tap/commit/8b5a2b5c8c4a288f57614df76aea72462b3dda5e))

# [1.4.0](https://github.com/JinnElements/jinn-tap/compare/v1.3.0...v1.4.0) (2025-04-16)


### Bug Fixes

* allow a slot to be addressed more than once ([85b9205](https://github.com/JinnElements/jinn-tap/commit/85b92059e724cffb3e4c3564d227feb2963d5d69))


### Features

* add copy tei to clipboard action ([89be0a0](https://github.com/JinnElements/jinn-tap/commit/89be0a04d0de12667f6de56fb721117565583ea2))

# [1.3.0](https://github.com/JinnElements/jinn-tap/compare/v1.2.0...v1.3.0) (2025-04-16)


### Features

* add support for opener, closer and lb ([55b9a04](https://github.com/JinnElements/jinn-tap/commit/55b9a04cc07fa3f8cf191e0e128a8d101779977b))

# [1.2.0](https://github.com/JinnElements/jinn-tap/compare/v1.1.3...v1.2.0) (2025-04-15)


### Features

* allow head inside a list ([ec29379](https://github.com/JinnElements/jinn-tap/commit/ec2937973bc890323c3d2dc0647ac67fbaf2fc26))

## [1.1.3](https://github.com/JinnElements/jinn-tap/compare/v1.1.2...v1.1.3) (2025-04-15)


### Bug Fixes

* **attribute-panel:** scroll the highlighted occurrence into view ([d1065e8](https://github.com/JinnElements/jinn-tap/commit/d1065e8dd7acf54dc085d3552a53b3e62c14f4fa))

## [1.1.2](https://github.com/JinnElements/jinn-tap/compare/v1.1.1...v1.1.2) (2025-04-15)


### Bug Fixes

* refactor mechanism to inject into slots to be more generic ([eecc798](https://github.com/JinnElements/jinn-tap/commit/eecc798f84b1d2324bd20f0f93fabe3058a28001))

## [1.1.1](https://github.com/JinnElements/jinn-tap/compare/v1.1.0...v1.1.1) (2025-04-15)


### Bug Fixes

* close toolbar dropdown after selection ([e9ba367](https://github.com/JinnElements/jinn-tap/commit/e9ba367f4b67d91eaca594541e726bd65b34ca8f))

# [1.1.0](https://github.com/JinnElements/jinn-tap/compare/v1.0.1...v1.1.0) (2025-04-15)


### Features

* add apply-all button to occurrences ([fdb1abc](https://github.com/JinnElements/jinn-tap/commit/fdb1abc13066a5111217c1a598e1c90bce66fbb3))
* add support for ref links ([0a5e238](https://github.com/JinnElements/jinn-tap/commit/0a5e23882b25e674f2f859dd8d21398e3e7a5506))

## [1.0.1](https://github.com/JinnElements/jinn-tap/compare/v1.0.0...v1.0.1) (2025-04-15)


### Bug Fixes

* entity assignments should always be applied automatically ([24602ef](https://github.com/JinnElements/jinn-tap/commit/24602efb3d125eaeca377e8b033ad19cfa486da0))

# 1.0.0 (2025-04-15)


### Bug Fixes

* add tooltip to debug toolbar button ([c742b63](https://github.com/JinnElements/jinn-tap/commit/c742b63d267145b117cf0a03ae5079d5a4210e42))
* after setting content, move cursor to start ([ec374ef](https://github.com/JinnElements/jinn-tap/commit/ec374ef53884e175c7065e644be78f216cd93db3))
* allow custom items to be added to toolbar via slot ([ea12340](https://github.com/JinnElements/jinn-tap/commit/ea1234003027f94f9ca4067e481e4d641321450d))
* another attempt to fix list handling ([b71f71a](https://github.com/JinnElements/jinn-tap/commit/b71f71a3a20fc10cfacc8c278de9d336e28b7436))
* **AttributePanel:** code cleanup ([ad4a8a8](https://github.com/JinnElements/jinn-tap/commit/ad4a8a8dcccbdd9cc05b18bf74d1c5603ff9ff06))
* changing attributes on an existing mark failed: selection needs to cover the entire mark ([3cde4ab](https://github.com/JinnElements/jinn-tap/commit/3cde4abdf8a1c7db6e48ee2d54e8d634dc1f0e24))
* clicking on footnote anchor should select associated note ([25ed362](https://github.com/JinnElements/jinn-tap/commit/25ed362f8b6ff7cd2127c60c113773a4e893695c))
* clicking on node in navigator should show node's attributes ([658feee](https://github.com/JinnElements/jinn-tap/commit/658feeed7ee4b8d92cd4ad5412b0ca6c7c451594))
* correct serialization of nested marks ([3946968](https://github.com/JinnElements/jinn-tap/commit/394696876aef0b5ac312e6e1dcf2f6798ec9fcf7))
* display current reference for entities ([2044453](https://github.com/JinnElements/jinn-tap/commit/2044453c9ca82fac46bf1443ff53e5849030dd8c))
* do not bundle pb-components ([b03b6f0](https://github.com/JinnElements/jinn-tap/commit/b03b6f0d61cdd334252b1cb40a226f62678ecff3))
* emit ready event ([6816003](https://github.com/JinnElements/jinn-tap/commit/6816003aa12e907a2fa9a777c0d172202099c0cf))
* entering lists ([80b27c9](https://github.com/JinnElements/jinn-tap/commit/80b27c994a478fd684990917af1bf6b13da8a06c))
* footnote handling ([a65cbb9](https://github.com/JinnElements/jinn-tap/commit/a65cbb90fd4668668978c4b23d0d6fa1b97498c3))
* footnote reshuffling after insert ([acaa181](https://github.com/JinnElements/jinn-tap/commit/acaa18115d028ea96526232ea041dc20ccf082d8))
* further fix to list handling ([1c5f780](https://github.com/JinnElements/jinn-tap/commit/1c5f7807df2f358e185d3d3bec072367b344a33e))
* handle footnote deletion ([b50f677](https://github.com/JinnElements/jinn-tap/commit/b50f677a28aad35d943010f2652456ab6dfcd416))
* handling of footnotes already in the text ([cad53c0](https://github.com/JinnElements/jinn-tap/commit/cad53c012e2fdcf06eb3fbca6f75d32ab672e9b6))
* ignore attributes starting with _; add global id attribute ([3b2ca5b](https://github.com/JinnElements/jinn-tap/commit/3b2ca5bc08d227ac4a73737cbad52416f4d1b12a))
* make highlight overlay more visible ([6b578f7](https://github.com/JinnElements/jinn-tap/commit/6b578f72ac6d9454329857dee61d86afedbe9c58))
* more compact TEI output view ([de860be](https://github.com/JinnElements/jinn-tap/commit/de860be43c8ab21ec0f10806a25cf5d6b790e628))
* output self-closing element for empty content nodes ([94b64cf](https://github.com/JinnElements/jinn-tap/commit/94b64cfc68c74b133cd979f8c63f1d262ebbb9c9))
* serialization of nested marks ([cc3165f](https://github.com/JinnElements/jinn-tap/commit/cc3165f95ffc0923d17ac83cf33592edf26844b3))
* serialization of xml:id; allow content to be loaded from url ([1dc4b2e](https://github.com/JinnElements/jinn-tap/commit/1dc4b2e58c618afb8496a7d18256be2172e950d9))
* specify initial content as children of component ([b285ccb](https://github.com/JinnElements/jinn-tap/commit/b285ccb879b78443ff87293d6985a70deb81e3a7))
* still update attribute panel if authority attribute changed ([2582dae](https://github.com/JinnElements/jinn-tap/commit/2582dae68010be8aff390e06cc15b14948c96027))
* styling fixes: make toolbar and attribute panel sticky ([52bcdae](https://github.com/JinnElements/jinn-tap/commit/52bcdae17d0db2f4fa460a325e983cc6e36411ae))
* try to fix submission of authority key ([8dc4ca8](https://github.com/JinnElements/jinn-tap/commit/8dc4ca80cdbbdbfbcc3ccd3d2f02191626372b59))
* use _ for internal attributes and ignore them when serializing ([8dcb1c6](https://github.com/JinnElements/jinn-tap/commit/8dcb1c666822c40cd038a44a0ba35fc345f290ba))
* use a nav for the toolbar to be more compact ([a67c71b](https://github.com/JinnElements/jinn-tap/commit/a67c71bc03d01f4630d51ef9d35494b449683ead))
* when moving into a mark, also check if it has the same parent node to decide if attribute panel needs to refresh ([a3a2224](https://github.com/JinnElements/jinn-tap/commit/a3a2224c3adee9dc39f32d422384290c445e3aa8))


### Features

* add debug mode to see type of elements ([31c399d](https://github.com/JinnElements/jinn-tap/commit/31c399d307b2ff50144ce7b20ec504d591ea168c))
* add navigation panel to allow selecting ancestor nodes ([7cc21a6](https://github.com/JinnElements/jinn-tap/commit/7cc21a61d21490d74b7365e3c3fa9a24a1bcc4dd))
* add orgName and date, unset empty attributes ([2380d7d](https://github.com/JinnElements/jinn-tap/commit/2380d7d0c6a162fe8b70c67fa1710461bd7f0ce5))
* add support for entity lookups via tei-publisher-components ([4145099](https://github.com/JinnElements/jinn-tap/commit/41450997f970fdf09d055b4198fa3ba01cc77839))
* add upload button ([df9a015](https://github.com/JinnElements/jinn-tap/commit/df9a0156a3da64633eb77407eef7efbdd9bb6e90))
* add wrap and lift commands to blocks ([cb4d1dd](https://github.com/JinnElements/jinn-tap/commit/cb4d1dd2f13d68a2390ae850092145f7252249ec))
* allow toolbar buttons to be grouped into dropdown ([af923d7](https://github.com/JinnElements/jinn-tap/commit/af923d73b8f4aed36911610b58fde91335ad4171))
* refactor schema and support global attributes ([dbf53ae](https://github.com/JinnElements/jinn-tap/commit/dbf53ae5df0135348ac9255c8d48b470de501157))
* show placeholder text ([472eaae](https://github.com/JinnElements/jinn-tap/commit/472eaaef80d0bb4151f001bb65c9aaafc673c646))
* support numbered lists ([9999433](https://github.com/JinnElements/jinn-tap/commit/9999433c01d1eabc4bd3161d149927138a4093da))
* support search for other occurrences of entity in text ([edab724](https://github.com/JinnElements/jinn-tap/commit/edab724a7a01b03fbb967bc26a6bb71920dbd28a))
* WIP: add support for footnotes ([81e11b5](https://github.com/JinnElements/jinn-tap/commit/81e11b543a61ed0ea48bfe5b2ad829fa9adb4140))
