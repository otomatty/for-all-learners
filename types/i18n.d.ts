/**
 * Type definitions for next-intl
 * This file provides type-safe access to translation messages
 */

import type en from "../messages/en.json";

type Messages = typeof en;

declare global {
	// Use type safe message keys with `auto-complete` support
	interface IntlMessages extends Messages {}
}
