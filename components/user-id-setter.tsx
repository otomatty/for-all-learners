"use client";

import { useSetAtom } from "jotai";
import { useEffect } from "react";
import { userIdAtom } from "@/stores/user";

interface UserIdSetterProps {
	userId: string;
}

export function UserIdSetter({ userId }: UserIdSetterProps) {
	const setUserId = useSetAtom(userIdAtom);
	useEffect(() => {
		setUserId(userId);
	}, [userId, setUserId]);
	return null;
}
