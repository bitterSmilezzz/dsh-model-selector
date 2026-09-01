/**
 * ModelSelect: the enhanced composer model seat (`conversation.input.model`).
 *
 * A single-pane menu (simpler than the shipped two-level root menu): opening
 * the seat lands directly on the model list — search box + collapsible
 * provider groups — with the current model's effort slider pinned inline at
 * the bottom of the menu, so switching models and tuning reasoning effort
 * both happen in one surface without an intermediate page.
 *
 * Data and submission ride the SAME per-session directory the /model popup
 * shares (via `modelDirectories`), so a switch made here is what the popup
 * shows next and vice versa. Icons, Toast and the menu fit/dismiss hooks are
 * reused from @deepseek-ai/dsh-client-ui-primitives at runtime; colors
 * come from `--dsw-*` tokens in the injected stylesheet.
 */
import * as react from 'react';
import { zh as zhDict, en as enDict } from './locales.ts';
export { zhDict, enDict };
import type { ModelDirectoryState } from '@deepseek-ai/dsh-client-ui-model-selection/client';
import type { TranslateNS } from '@deepseek-ai/dsh-client-ui-slots';
import type { SnapshotStore } from '@deepseek-ai/dsh-client-store';
import type { ModelSelection } from '@deepseek-ai/dsh-api-session-controller/types';
/** Per-session model directory snapshot (official state shape). */
type DirectoryState = ModelDirectoryState;
interface EffortSliderProps {
    state: DirectoryState;
    select: (selection: ModelSelection) => Promise<boolean>;
    t: TranslateNS<'modelSelector'>;
}
export declare const EffortSlider: react.MemoExoticComponent<({ state, select, t }: EffortSliderProps) => react.JSX.Element | null>;
interface ModelSelectProps {
    locked: boolean;
    available: boolean;
    directory: SnapshotStore<ModelDirectoryState>;
    load: () => void;
    select: (selection: ModelSelection) => Promise<boolean>;
    t: TranslateNS<'modelSelector'>;
}
export declare function ModelSelect({ locked, available, directory, load, select, t }: ModelSelectProps): react.JSX.Element | null;
//# sourceMappingURL=ModelSelect.d.ts.map