import { z } from "zod";

export const UserSchema = z.object({
	id: z.number().int().positive(),
	name: z.string().min(1).max(100),
	email: z.email(),
});

export type User = z.infer<typeof UserSchema>;

export const CreateUserSchema = UserSchema.omit({ id: true });

export type CreateUser = z.infer<typeof CreateUserSchema>;

export const UpdateUserSchema = UserSchema.partial();

export type UpdateUser = z.infer<typeof UpdateUserSchema>;

export const UserParamsSchema = z.object({
	id: z.coerce.number().int().positive(),
});

export const ErrorSchema = z.object({
	message: z.string(),
});
