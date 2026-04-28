/**
 * Task 6.2 — drop onto elements with `use:telemetry={{ ... }}` to log interactions
 * without wiring handlers in each component.
 */
import type { Action } from "svelte/action";
import { tryGetActiveProject } from "$lib/workspace/active-project-api";
import { logTelemetryEvent } from "./log-telemetry-event";

export type TelemetryTrigger = "click" | "pointerdown";

export type TelemetryActionParams = {
	event_type: string;
	/** Explicit project silo; when omitted, uses active project context at mount time */
	projectId?: string | null;
	payload?: Record<string, unknown>;
	trigger?: TelemetryTrigger;
};

function resolveProjectId(explicit: string | null | undefined): string | null {
	if (explicit !== undefined) return explicit;
	return tryGetActiveProject()?.activeProjectId ?? null;
}

/**
 * Svelte action — usage: `use:telemetry={{ event_type: 'sidebar.nav.projects', payload: { ... } }}`
 */
export const telemetry: Action<HTMLElement, TelemetryActionParams | undefined> = (node, params) => {
	let snapshot = params;
	/** Resolved when `attach` runs — `getContext` is only valid during mount/update, not in DOM handlers */
	let projectSnapshot: string | null = null;

	function emit(original?: Event) {
		const p = snapshot;
		if (!p?.event_type) return;

		logTelemetryEvent({
			event_type: p.event_type,
			projectId: projectSnapshot,
			payload: {
				...p.payload,
				tag: node.tagName.toLowerCase(),
				...(original?.type ? { domEvent: original.type } : {}),
			},
		});
	}

	function onClick(ev: MouseEvent) {
		emit(ev);
	}

	function onPointerDown(ev: PointerEvent) {
		emit(ev);
	}

	function attach(p: TelemetryActionParams | undefined) {
		detach();
		snapshot = p;
		projectSnapshot = resolveProjectId(p?.projectId);
		const trigger = p?.trigger ?? "click";
		if (!p?.event_type) return;
		if (trigger === "pointerdown") {
			node.addEventListener("pointerdown", onPointerDown, { passive: true });
		} else {
			node.addEventListener("click", onClick);
		}
	}

	function detach() {
		node.removeEventListener("click", onClick);
		node.removeEventListener("pointerdown", onPointerDown);
	}

	attach(params);

	return {
		update(newParams: TelemetryActionParams | undefined) {
			attach(newParams);
		},
		destroy() {
			detach();
		},
	};
};

/** Alias if your style guide prefers `use:useTelemetry` */
export const useTelemetry = telemetry;
