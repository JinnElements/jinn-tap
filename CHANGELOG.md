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
