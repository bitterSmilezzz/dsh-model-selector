/**
* Stylesheet for the enhanced model seat.
*
* Injected as one `<style data-plugin="@bittersmilezzz/dsh-model-selector">` tag by the client
* apply and removed again on unload. Class names are prefixed `dms-` so they
* cannot collide with CSS-module hashes from other plugins. Colors come only
* from `--dsw-*` theme tokens, matching the shipped Menu material.
*
* 显式 `: string` 注解：不加注解时 tsc 会把整份 CSS 推断成字面量类型并写进
* lib/types/client/styles.d.ts（19KB 的 d.ts 只为声明一个常量），发布包里
* 白白多出十几 KB 且每次改样式都全量重写。
*/
export declare const CSS: string;
//# sourceMappingURL=styles.d.ts.map