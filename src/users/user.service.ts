import type { CreateUser, UpdateUser, User } from "./user.schema.js";

import {
	createUser,
	deleteUser,
	findAllUsers,
	findUserById,
	updateUser,
} from "./user.repository.js";

export async function getUsers(): Promise<User[]> {
	return findAllUsers();
}

export async function getUser(id: number): Promise<User | undefined> {
	return findUserById(id);
}

export async function addUser(input: CreateUser): Promise<User> {
	return createUser(input);
}

export async function editUser(
	id: number,
	input: UpdateUser,
): Promise<User | undefined> {
	return updateUser(id, input);
}

export async function removeUser(id: number): Promise<boolean> {
	return deleteUser(id);
}
