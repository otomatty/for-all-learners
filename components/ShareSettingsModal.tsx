"use client";

import { atom, useAtom } from "jotai";
import { Copy, Globe, Link, Lock, Trash2, UserPlus } from "lucide-react";
import React, { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogClose,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { useGenerateNoteShareLink } from "@/hooks/notes/useGenerateNoteShareLink";
import { useJoinNoteByLink } from "@/hooks/notes/useJoinNoteByLink";
import { useJoinNotePublic } from "@/hooks/notes/useJoinNotePublic";
import { useNoteShareLinks } from "@/hooks/notes/useNoteShareLinks";
import { useNoteShares } from "@/hooks/notes/useNoteShares";
import { useRevokeNoteShareLink } from "@/hooks/notes/useRevokeNoteShareLink";
import { useShareNote } from "@/hooks/notes/useShareNote";
import { useUnshareNote } from "@/hooks/notes/useUnshareNote";
import { useUpdateNote } from "@/hooks/notes/useUpdateNote";
import { createClient } from "@/lib/supabase/client";

// ウィザードの現在ステップを管理するAtom
const currentStepAtom = atom(0);

interface ShareSettingsModalProps {
	note: {
		id: string;
		slug: string;
		title: string;
		description: string | null;
		visibility: "public" | "unlisted" | "invite" | "private";
		pageCount: number;
		participantCount: number;
		updatedAt: string;
		ownerId: string;
	};
	open?: boolean;
	onOpenChange?: (open: boolean) => void;
}

export function ShareSettingsModal({
	note,
	open: controlledOpen,
	onOpenChange: controlledOnOpenChange,
}: ShareSettingsModalProps) {
	const [internalOpen, setInternalOpen] = useState(false);
	// Use controlled state if provided, otherwise use internal state
	const open = controlledOpen ?? internalOpen;
	const setOpen = controlledOnOpenChange ?? setInternalOpen;
	const [currentUserId, setCurrentUserId] = useState<string | null>(null);
	const [visibility, setVisibility] = useState(note.visibility);
	const [inviteUserId, setInviteUserId] = useState("");
	const [linkTokenInput, setLinkTokenInput] = useState("");
	// ウィザード管理ステップ
	const [currentStep, setCurrentStep] = useAtom(currentStepAtom);

	// Hooks
	const { data: shares = [] } = useNoteShares(note.id);
	const { data: links = [] } = useNoteShareLinks(note.id);
	const generateLink = useGenerateNoteShareLink();
	const revokeLink = useRevokeNoteShareLink();
	const shareNoteMutation = useShareNote();
	const unshareNoteMutation = useUnshareNote();
	const updateNoteMutation = useUpdateNote();
	const joinByLink = useJoinNoteByLink();
	const joinPublic = useJoinNotePublic();

	useEffect(() => {
		const supabase = createClient();
		async function fetchUser() {
			const {
				data: { user },
				error,
			} = await supabase.auth.getUser();
			if (!error && user) {
				setCurrentUserId(user.id);
			}
		}
		fetchUser();
	}, []);

	// Shares and links are now fetched via hooks, no need for useEffect

	// モーダル開くたびにステップをリセット
	useEffect(() => {
		if (open) setCurrentStep(0);
	}, [open, setCurrentStep]);

	// ステップ構成を可変で定義
	const steps = React.useMemo(() => {
		const base = [
			{
				key: "visibility",
				label: "公開範囲",
				description: "公開範囲を設定できます",
			},
		];
		if (visibility === "invite")
			base.push({
				key: "invite",
				label: "招待ユーザー",
				description: "ユーザーを招待できます",
			});
		if (visibility === "unlisted")
			base.push({
				key: "link",
				label: "限定リンク",
				description: "リンクを生成できます",
			});
		return base;
	}, [visibility]);

	const handleVisibilityChange = async (value: typeof visibility) => {
		updateNoteMutation.mutate(
			{ id: note.id, payload: { visibility: value } },
			{
				onSuccess: () => {
					setVisibility(value);
				},
			},
		);
	};

	const handleInvite = async () => {
		if (!inviteUserId) return;
		shareNoteMutation.mutate(
			{ noteId: note.id, userId: inviteUserId, permission: "viewer" },
			{
				onSuccess: () => {
					setInviteUserId("");
				},
			},
		);
	};

	const handleUnshare = async (userId: string) => {
		unshareNoteMutation.mutate({ noteId: note.id, userId });
	};

	const handleGenerateLink = async () => {
		generateLink.mutate({ noteId: note.id, permission: "viewer" });
	};

	const handleRevokeLink = async (token: string) => {
		revokeLink.mutate(token);
	};

	const handleJoinByLink = async () => {
		if (!linkTokenInput) return;
		joinByLink.mutate(linkTokenInput, {
			onSuccess: () => {
				setLinkTokenInput("");
			},
		});
	};

	const handleJoinPublic = async () => {
		joinPublic.mutate(note.slug);
	};

	return (
		<Dialog open={open} onOpenChange={setOpen}>
			{/* DialogTrigger は制御されていない場合のみ表示 */}
			{controlledOpen === undefined && (
				<DialogTrigger asChild>
					<Button variant="outline">共有設定</Button>
				</DialogTrigger>
			)}
			<DialogContent>
				<DialogHeader>
					<DialogTitle>共有設定</DialogTitle>
					<DialogDescription>ノートの共有設定を管理します</DialogDescription>
					{/* セグメントコントロール */}
					<ToggleGroup
						type="single"
						value={steps[currentStep].key}
						onValueChange={(value) => {
							const idx = steps.findIndex((s) => s.key === value);
							if (idx !== -1) setCurrentStep(idx);
						}}
						variant="outline"
						className="mt-2 w-full"
					>
						{steps.map((step) => (
							<ToggleGroupItem key={step.key} value={step.key}>
								{step.label}
							</ToggleGroupItem>
						))}
					</ToggleGroup>
					{/* 現在ステップの説明 */}
					<p className="text-sm text-muted-foreground mt-1">
						{steps[currentStep].description}
					</p>
				</DialogHeader>

				{/* ウィザードステップコンテンツ */}
				{steps[currentStep].key === "visibility" && (
					<section>
						<h3 className="font-semibold mt-4">公開範囲</h3>
						<div className="flex flex-col gap-4 mt-2">
							{/* 非公開 */}
							<button
								type="button"
								className={`w-full p-4 border rounded cursor-pointer flex flex-col items-start ${visibility === "private" ? "border-primary bg-primary/5" : "border-border"}`}
								onClick={() => handleVisibilityChange("private")}
								onKeyDown={(e) => {
									if (e.key === "Enter" || e.key === " ") {
										e.preventDefault();
										handleVisibilityChange("private");
									}
								}}
							>
								<div className="flex items-center mb-2">
									<Lock className="w-6 h-6 mr-2" />
									<span className="font-semibold">非公開</span>
								</div>
								<p className="text-sm text-muted-foreground mb-2">
									ノートのオーナーのみ閲覧可能です。
								</p>
								<Badge variant="destructive">オーナーのみ</Badge>
							</button>
							{/* 招待 */}
							<button
								type="button"
								className={`w-full p-4 border rounded cursor-pointer flex flex-col items-start ${visibility === "invite" ? "border-primary bg-primary/5" : "border-border"}`}
								onClick={() => handleVisibilityChange("invite")}
								onKeyDown={(e) => {
									if (e.key === "Enter" || e.key === " ") {
										e.preventDefault();
										handleVisibilityChange("invite");
									}
								}}
							>
								<div className="flex items-center mb-2">
									<UserPlus className="w-6 h-6 mr-2" />
									<span className="font-semibold">招待</span>
								</div>
								<p className="text-sm text-muted-foreground mb-2">
									招待されたユーザーのみ閲覧・編集できます。
								</p>
								<Badge variant="default">招待ユーザー</Badge>
							</button>
							{/* 限定公開 */}
							<button
								type="button"
								className={`w-full p-4 border rounded cursor-pointer flex flex-col items-start ${visibility === "unlisted" ? "border-primary bg-primary/5" : "border-border"}`}
								onClick={() => handleVisibilityChange("unlisted")}
								onKeyDown={(e) => {
									if (e.key === "Enter" || e.key === " ") {
										e.preventDefault();
										handleVisibilityChange("unlisted");
									}
								}}
							>
								<div className="flex items-center mb-2">
									<Link className="w-6 h-6 mr-2" />
									<span className="font-semibold">限定公開</span>
								</div>
								<p className="text-sm text-muted-foreground mb-2">
									URLを知っている人のみ閲覧できます。
								</p>
								<Badge variant="outline">URLを知っている人</Badge>
							</button>
							{/* 公開 */}
							<button
								type="button"
								className={`w-full p-4 border rounded cursor-pointer flex flex-col items-start ${visibility === "public" ? "border-primary bg-primary/5" : "border-border"}`}
								onClick={() => handleVisibilityChange("public")}
								onKeyDown={(e) => {
									if (e.key === "Enter" || e.key === " ") {
										e.preventDefault();
										handleVisibilityChange("public");
									}
								}}
							>
								<div className="flex items-center mb-2">
									<Globe className="w-6 h-6 mr-2" />
									<span className="font-semibold">公開</span>
								</div>
								<p className="text-sm text-muted-foreground mb-2">
									全てのユーザーが閲覧できます。
								</p>
								<Badge variant="secondary">全員</Badge>
							</button>
						</div>
					</section>
				)}
				{steps[currentStep].key === "invite" && (
					<section>
						<h3 className="font-semibold mt-4">招待ユーザー</h3>
						<div className="flex space-x-2 mb-2">
							<Input
								placeholder="ユーザーIDを入力"
								value={inviteUserId}
								onChange={(e) => setInviteUserId(e.target.value)}
							/>
							<Button onClick={handleInvite}>
								<UserPlus className="w-4 h-4 mr-1" />
								招待
							</Button>
						</div>
						<Table>
							<TableHeader>
								<TableRow>
									<TableHead>ユーザーID</TableHead>
									<TableHead>権限</TableHead>
									<TableHead>操作</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{shares.map((s) => (
									<TableRow key={s.shared_with_user_id}>
										<TableCell>{s.shared_with_user_id}</TableCell>
										<TableCell>{s.permission_level}</TableCell>
										<TableCell>
											<Button
												variant="ghost"
												onClick={() => handleUnshare(s.shared_with_user_id)}
											>
												<Trash2 className="w-4 h-4" />
											</Button>
										</TableCell>
									</TableRow>
								))}
							</TableBody>
						</Table>
					</section>
				)}
				{steps[currentStep].key === "link" && (
					<section>
						<h3 className="font-semibold mt-4">リンク共有</h3>
						<Button className="mb-2" onClick={handleGenerateLink}>
							リンク生成
						</Button>
						<Table>
							<TableHeader>
								<TableRow>
									<TableHead>リンクURL</TableHead>
									<TableHead>有効期限</TableHead>
									<TableHead>操作</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{links.map((l) => (
									<TableRow key={l.token}>
										<TableCell>
											<div className="flex items-center space-x-2">
												<span className="font-mono">{`${window.location.origin}/notes/${note.slug}?token=${l.token}`}</span>
												<Button
													variant="ghost"
													onClick={() =>
														navigator.clipboard.writeText(
															`${window.location.origin}/notes/${note.slug}?token=${l.token}`,
														)
													}
												>
													<Copy className="w-4 h-4" />
												</Button>
											</div>
										</TableCell>
										<TableCell>
											{l.expires_at
												? new Date(l.expires_at).toLocaleString()
												: "なし"}
										</TableCell>
										<TableCell>
											<Button
												variant="ghost"
												onClick={() => handleRevokeLink(l.token)}
											>
												<Trash2 className="w-4 h-4" />
											</Button>
										</TableCell>
									</TableRow>
								))}
							</TableBody>
						</Table>
					</section>
				)}

				{/* 参加 */}
				{currentUserId !== note.ownerId &&
					(visibility === "public" || visibility === "unlisted") && (
						<section>
							<h3 className="font-semibold mt-4">参加</h3>
							{visibility === "public" && (
								<Button onClick={handleJoinPublic}>参加する</Button>
							)}
							{visibility === "unlisted" && (
								<div className="flex space-x-2">
									<Input
										placeholder="トークンを入力"
										value={linkTokenInput}
										onChange={(e) => setLinkTokenInput(e.target.value)}
									/>
									<Button onClick={handleJoinByLink}>参加</Button>
								</div>
							)}
						</section>
					)}

				<DialogFooter className="flex justify-between">
					<div className="flex space-x-2">
						{currentStep > 0 && (
							<Button
								variant="outline"
								onClick={() => setCurrentStep(currentStep - 1)}
							>
								戻る
							</Button>
						)}
						{currentStep < steps.length - 1 && (
							<Button
								variant="outline"
								onClick={() => setCurrentStep(currentStep + 1)}
							>
								次へ
							</Button>
						)}
					</div>
					<DialogClose asChild>
						<Button>保存</Button>
					</DialogClose>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
