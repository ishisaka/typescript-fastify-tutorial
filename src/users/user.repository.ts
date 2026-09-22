import type {CreateUser, User,} from "./user.schema.js";

const users: User[] = [
    {
        id: 1,
        name: "John Doe",
        email: "john.doe@example.com"
    },
    {
        id: 2,
        name: "Jane Doe",
        email: "jane.doe@example.com"
    }
];

let nextId = 3;

export async function findAllUsers(): Promise<User[]> {
    return users;
}

export async function findUserById(id: number): Promise<User | undefined> {
    return users.find(user => user.id === id);
}

export async function createUser(input: CreateUser): Promise<User> {

    const user: User = {
        id: nextId++,
        ...input
    };

    users.push(user);

    return user;
}

export async function deleteUser(id: number): Promise<boolean> {

    const index = users.findIndex(user => user.id === id);

    if (index === -1) {
        return false;
    }

    users.splice(index, 1);

    return true;
}