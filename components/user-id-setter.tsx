"use client";

import { userIdAtom } from "@/stores/user";
import { useSetAtom } from "jotai";
import { useEffect } from "react";

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
