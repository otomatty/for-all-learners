"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useGenerateKeyPair } from "@/hooks/plugins/usePluginSignatureKeyPair";
import { useGeneratePluginSignature } from "@/hooks/plugins/usePluginSignatures";
import type { SignatureAlgorithm } from "@/lib/plugins/plugin-signature/types";

interface SignPluginDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	pluginId: string;
	pluginName: string;
}

export function SignPluginDialog({
	open,
	onOpenChange,
	pluginId,
	pluginName,
}: SignPluginDialogProps) {
	const router = useRouter();
	const [privateKey, setPrivateKey] = useState("");
	const [algorithm, setAlgorithm] = useState<SignatureAlgorithm>("ed25519");
	const [generatedKeyPair, setGeneratedKeyPair] = useState<{
		publicKey: string;
		privateKey: string;
	} | null>(null);
	const generateSignatureMutation = useGeneratePluginSignature();
	const generateKeyPairMutation = useGenerateKeyPair();

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();

		try {
			const finalPrivateKey = generatedKeyPair
				? generatedKeyPair.privateKey
				: privateKey;

			if (!finalPrivateKey.trim()) {
				toast.error("秘密鍵を入力してください");
				return;
			}

			await generateSignatureMutation.mutateAsync({
				pluginId,
				privateKey: finalPrivateKey,
				algorithm,
				generateNewKeyPair: !!generatedKeyPair,
			});

			toast.success("署名が正常に生成されました");
			onOpenChange(false);
			setPrivateKey("");
			setGeneratedKeyPair(null);
			router.refresh();
		} catch (error) {
			toast.error(
				error instanceof Error
					? error.message
					: "署名の生成中にエラーが発生しました",
			);
		}
	};

	const handleGenerateKeyPair = async () => {
		try {
			const keyPair = await generateKeyPairMutation.mutateAsync({
				algorithm,
			});

			setGeneratedKeyPair({
				publicKey: keyPair.publicKey,
				privateKey: keyPair.privateKey,
			});
			setPrivateKey(keyPair.privateKey);
			toast.success("鍵ペアが生成されました。秘密鍵を安全に保存してください。");
		} catch (error) {
			toast.error(
				error instanceof Error
					? error.message
					: "鍵ペアの生成中にエラーが発生しました",
			);
		}
	};

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-[600px]">
				<DialogHeader>
					<DialogTitle>プラグイン署名を生成</DialogTitle>
					<DialogDescription>
						{pluginName} ({pluginId}) の署名を生成します。
					</DialogDescription>
				</DialogHeader>

				<form onSubmit={handleSubmit} className="space-y-4">
					<div className="space-y-2">
						<Label htmlFor="algorithm">署名アルゴリズム</Label>
						<Select
							value={algorithm}
							onValueChange={(value) => {
								setAlgorithm(value as SignatureAlgorithm);
								setGeneratedKeyPair(null);
								setPrivateKey("");
							}}
						>
							<SelectTrigger id="algorithm">
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="ed25519">Ed25519 (推奨)</SelectItem>
								<SelectItem value="rsa">RSA</SelectItem>
							</SelectContent>
						</Select>
					</div>

					<div className="space-y-2">
						<div className="flex items-center justify-between">
							<Label htmlFor="privateKey">秘密鍵</Label>
							<Button
								type="button"
								variant="outline"
								size="sm"
								onClick={handleGenerateKeyPair}
								disabled={generateKeyPairMutation.isPending}
							>
								新しい鍵ペアを生成
							</Button>
						</div>
						<Textarea
							id="privateKey"
							placeholder="PEM形式の秘密鍵を入力するか、新しい鍵ペアを生成してください"
							value={privateKey}
							onChange={(e) => setPrivateKey(e.target.value)}
							rows={6}
							className="font-mono text-sm"
							required
						/>
						{generatedKeyPair && (
							<div className="rounded-md bg-muted p-3 space-y-2">
								<p className="text-sm font-medium">公開鍵:</p>
								<pre className="text-xs font-mono break-all bg-background p-2 rounded">
									{generatedKeyPair.publicKey}
								</pre>
								<p className="text-xs text-muted-foreground">
									⚠️
									秘密鍵を安全に保存してください。このダイアログを閉じると表示されなくなります。
								</p>
							</div>
						)}
					</div>

					<DialogFooter>
						<Button
							type="button"
							variant="outline"
							onClick={() => {
								onOpenChange(false);
								setPrivateKey("");
								setGeneratedKeyPair(null);
							}}
							disabled={generateSignatureMutation.isPending}
						>
							キャンセル
						</Button>
						<Button
							type="submit"
							disabled={
								generateSignatureMutation.isPending || !privateKey.trim()
							}
						>
							{generateSignatureMutation.isPending ? "生成中..." : "署名を生成"}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}
