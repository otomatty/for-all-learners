"use server";

import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database.types";

export async function getAccountById(id: string) {
	const supabase = await createClient();
	const { data, error } = await supabase
		.from("accounts")
		.select("*")
		.eq("id", id)
		.maybeSingle();
	if (error) throw error;
	return data;
}

export async function createAccount(
	account: Database["public"]["Tables"]["accounts"]["Insert"],
) {
	const supabase = await createClient();
	const { data, error } = await supabase
		.from("accounts")
		.insert(account)
		.single();
	if (error) throw error;
	return data;
}

export async function updateAccount(
	id: string,
	updates: Database["public"]["Tables"]["accounts"]["Update"],
) {
	const supabase = await createClient();
	const { data, error } = await supabase
		.from("accounts")
		.update(updates)
		.eq("id", id)
		.single();
	if (error) throw error;
	return data;
}

export async function deleteAccount(id: string) {
	const supabase = await createClient();
	const { data, error } = await supabase
		.from("accounts")
		.delete()
		.eq("id", id)
		.single();
	if (error) throw error;
	return data;
}
