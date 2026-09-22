import type { CreateUser, User, UpdateUser } from "./user.schema.js";

const users: User[] = [
	{
		id: 1,
		name: "John Doe",
		email: "john.doe@example.com",
	},
	{
		id: 2,
		name: "Jane Doe",
		email: "jane.doe@example.com",
	},
];

let nextId = 3;

/**
 * Fetches and returns a list of all users.
 *
 * @return {Promise<User[]>} A promise that resolves to an array of user objects.
 */
export async function findAllUsers(): Promise<User[]> {
	return users;
}

/**
 * Retrieves a user by their unique identifier.
 *
 * @param {number} id - The unique identifier of the user to find.
 * @return {Promise<User | undefined>} A promise that resolves to the user object if found, or undefined if no user matches the given identifier.
 */
export async function findUserById(id: number): Promise<User | undefined> {
	return users.find((user) => user.id === id);
}

/**
 * Creates a new user with the provided input data.
 *
 * @param {CreateUser} input - The data for the new user to be created.
 * @return {Promise<User>} A promise that resolves to the newly created user object.
 */
export async function createUser(input: CreateUser): Promise<User> {
	const user: User = {
		id: nextId++,
		...input,
	};

	users.push(user);

	return user;
}

/**
 * Deletes a user by their unique identifier.
 *
 * @param {number} id - The unique identifier of the user to delete.
 * @return {Promise<boolean>} A promise that resolves to true if the user was deleted, or false if no user matches the given identifier.
 */
export async function deleteUser(id: number): Promise<boolean> {
	const index = users.findIndex((user) => user.id === id);

	if (index === -1) {
		return false;
	}

	users.splice(index, 1);

	return true;
}

export async function updateUser(
	id: number,
	input: UpdateUser,
): Promise<User | undefined> {
	const user = users.find((user) => user.id === id);

	if (!user) {
		return undefined;
	}

	if (input.name !== undefined) {
		user.name = input.name;
	}

	if (input.email !== undefined) {
		user.email = input.email;
	}

	return user;
}
