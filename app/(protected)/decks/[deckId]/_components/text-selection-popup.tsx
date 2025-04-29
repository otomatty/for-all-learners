import React from "react";

interface TextSelectionPopupProps {
	/** The X coordinate for positioning the popup */
	x: number;
	/** The Y coordinate for positioning the popup */
	y: number;
	/** The selected text */
	text: string;
	/** Callback when link conversion is requested */
	onConvertLink: (text: string) => void;
	/** Callback to close the popup */
	onClose: () => void;
}

/**
 * Popup component displayed near the selected text, offering link conversion
 */
export function TextSelectionPopup({
	x,
	y,
	text,
	onConvertLink,
	onClose,
}: TextSelectionPopupProps) {
	return (
		<div
			className="absolute bg-white border rounded shadow p-2 z-50"
			style={{ top: y + window.scrollY + 5, left: x + window.scrollX }}
		>
			<div className="mb-2 text-sm text-gray-700">
				"{text}" をリンクに変換しますか？
			</div>
			<div className="flex space-x-2">
				<button
					className="px-2 py-1 bg-blue-500 text-white rounded"
					onClick={() => onConvertLink(text)}
					type="button"
				>
					はい
				</button>
				<button
					className="px-2 py-1 bg-gray-300 text-gray-700 rounded"
					onClick={onClose}
					type="button"
				>
					いいえ
				</button>
			</div>
		</div>
	);
}
