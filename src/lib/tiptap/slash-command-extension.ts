import { Extension } from "@tiptap/core";
import { PluginKey } from "@tiptap/pm/state";
import { Suggestion } from "@tiptap/suggestion";

import { buildSlashMenuItems, filterSlashItems, type SlashMenuItem } from "./slash-menu-items";
import { createSlashSuggestionRenderer } from "./slash-suggestion-renderer";

export const SlashCommands = Extension.create({
	name: "slashCommands",

	addProseMirrorPlugins() {
		const editor = this.editor;

		return [
			Suggestion<SlashMenuItem>({
				editor,
				pluginKey: new PluginKey("slashCommands"),
				char: "/",
				allowSpaces: true,
				startOfLine: true,
				command: ({ editor: ed, range, props: item }) => {
					item.run(ed, range);
				},
				items: ({ query }) => filterSlashItems(buildSlashMenuItems(editor), query),
				render: () => createSlashSuggestionRenderer(),
			}),
		];
	},
});
