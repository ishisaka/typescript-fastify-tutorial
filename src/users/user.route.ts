import { z } from "zod";

import type { FastifyPluginAsyncZod } from "@fastify/type-provider-zod";

import {
	UserSchema,
	UserParamsSchema,
	CreateUserSchema,
	UpdateUserSchema,
	ErrorSchema,
} from "./user.schema.js";

import {
	getUsers,
	getUser,
	editUser,
	addUser,
	removeUser,
} from "./user.service.js";

export const userRoutes: FastifyPluginAsyncZod = async (app) => {
	app.get(
		"/users",
		{
			schema: {
				response: {
					200: UserSchema.array(),
				},
			},
		},

		async () => {
			return getUsers();
		},
	);

	app.get(
		"/users/:id",
		{
			schema: {
				params: UserParamsSchema,

				response: {
					200: UserSchema,

					404: ErrorSchema,
				},
			},
		},

		async (request, reply) => {
			const { id } = request.params;

			const user = await getUser(id);

			if (!user) {
				return reply.code(404).send({
					message: "User not found",
				});
			}

			return user;
		},
	);
	app.post(
		"/users",
		{
			schema: {
				body: CreateUserSchema,

				response: {
					201: UserSchema,
				},
			},
		},

		async (request, reply) => {
			const user = await addUser(request.body);

			return reply.code(201).send(user);
		},
	);

	app.put(
		"/users/:id",
		{
			schema: {
				params: UserParamsSchema,

				body: UpdateUserSchema,

				response: {
					200: UserSchema,

					404: ErrorSchema,
				},
			},
		},

		async (request, reply) => {
			const { id } = request.params;

			const user = await editUser(id, request.body);

			if (!user) {
				return reply.code(404).send({
					message: "User not found",
				});
			}

			return user;
		},
	);

	app.delete(
		"/users/:id",
		{
			schema: {
				params: UserParamsSchema,

				response: {
					204: z.null(),

					404: ErrorSchema,
				},
			},
		},

		async (request, reply) => {
			const deleted = await removeUser(request.params.id);

			if (!deleted) {
				return reply.code(404).send({
					message: "User not found",
				});
			}

			return reply.code(204).send(null);
		},
	);
};
