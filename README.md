# Go/C#経験者向け TypeScript + Fastify + Zod REST APIチュートリアル

## ゴール

今回は次のREST APIを作ります。

```text
GET    /users
GET    /users/:id
POST   /users
PUT    /users/:id
DELETE /users/:id
```

扱うデータは単純な`User`です。

```json
{
  "id": 1,
  "name": "Alice",
  "email": "alice@example.com"
}
```

このチュートリアルでは、単にAPIを動かすだけではなく、

- FastifyのRoute
- Zodによるruntime validation
- ZodからのTypeScript型推論
- Path Parameter
- Request Body
- Response Schema
- Repository
- Service
- HTTPステータスコード
- エラーハンドリング
- async / await
- Fastify Plugin
- Dependency Injection的な構造

まで扱います。

---

# 1. 今回の構成

最終的には次の構成にします。

```text
typescript-fastify-tutorial/
├── src/
│   ├── app.ts
│   ├── server.ts
│   │
│   └── users/
│       ├── user.schema.ts
│       ├── user.repository.ts
│       ├── user.service.ts
│       └── user.route.ts
│
├── package.json
├── tsconfig.json
└── package-lock.json
```

Goのプロジェクトで例えるなら、

```text
handler
service
repository
```

くらいに分けるイメージです。

---

# 2. プロジェクトを作る

```bash
mkdir typescript-fastify-tutorial
cd typescript-fastify-tutorial

npm init -y
```

必要なライブラリをインストールします。

```bash
npm install fastify zod @fastify/type-provider-zod
```

開発用に、

```bash
npm install --save-dev typescript tsx @types/node
```

も入れます。

---

# 3. Node.jsバージョンを確認する

Fastify v5はNode.js 20以上が必要です。

```bash
node --version
```

例えば、

```text
v22.20.0
```

であれば問題ありません。

---

# 4. TypeScriptを設定する

```bash
npx tsc --init
```

`tsconfig.json`を次のようにします。

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",

    "strict": true,

    "rootDir": "src",
    "outDir": "dist",

    "esModuleInterop": true,
    "skipLibCheck": true
  },

  "include": ["src"]
}
```

ここでも、

```json
"strict": true
```

は有効にしておきます。

---

# 5. package.json

ES Modulesとして実行するため、

```json
"type": "module"
```

を追加します。

scriptsも追加します。

```json
{
  "type": "module",

  "scripts": {
    "dev": "tsx watch src/server.ts",
    "build": "tsc",
    "start": "node dist/server.js"
  }
}
```

これで、

```bash
npm run dev
```

とすると、ファイル変更時に自動再起動されます。

---

# 6. 最小のFastifyサーバー

まず、

```text
src/server.ts
```

を作ります。

```typescript
import Fastify from "fastify";

const app = Fastify({
  logger: true,
});

app.get("/", async () => {
  return {
    message: "Hello Fastify",
  };
});

await app.listen({
  port: 3000,
  host: "0.0.0.0",
});
```

起動します。

```bash
npm run dev
```

ブラウザやcurlで、

```bash
curl http://localhost:3000
```

とします。

結果：

```json
{
  "message": "Hello Fastify"
}
```

これだけでHTTPサーバーが動きました。

---

# 7. FastifyのRoute

この部分、

```typescript
app.get("/", async () => {
  return {
    message: "Hello Fastify",
  };
});
```

がRouteです。

GoのHTTP handlerなら、

```go
http.HandleFunc("/", func(
    w http.ResponseWriter,
    r *http.Request,
) {
})
```

C#なら、

```csharp
app.MapGet("/", () => ...)
```

に近いです。

Fastifyでは、

```typescript
app.get();
app.post();
app.put();
app.delete();
```

のようにHTTP Methodごとに定義します。

---

# 8. Zodとは何か

ここでZodを導入します。

TypeScriptだけで、

```typescript
type User = {
  name: string;
  email: string;
};
```

と書いても、

HTTPから来たJSONが本当にこの形なのか、

```json
{
  "name": "Alice",
  "email": "alice@example.com"
}
```

runtimeでは確認できません。

例えば、

```json
{
  "name": 123,
  "email": false
}
```

が来るかもしれません。

TypeScriptの型はコンパイル時に消えるためです。

そこでZodを使います。

```typescript
import { z } from "zod";

const UserSchema = z.object({
  name: z.string(),
  email: z.email(),
});
```

これならruntimeでも検証できます。

Zod v4はTypeScriptの型システムに対応するschema APIを提供し、`.parse()`や`.safeParse()`によって実行時データを検証できます。

---

# 9. ZodからTypeScript型を作る

Zodの大きな利点の一つです。

```typescript
const UserSchema = z.object({
  id: z.number(),
  name: z.string(),
  email: z.email(),
});
```

このSchemaから、

```typescript
type User = z.infer<typeof UserSchema>;
```

とできます。

すると概念的には、

```typescript
type User = {
  id: number;
  name: string;
  email: string;
};
```

になります。

つまり、

```text
Zod Schema
   ↓
Runtime Validation
   +
TypeScript Type
```

の両方を得られます。

---

# 10. 型の二重管理を避ける

例えば、

```typescript
type User = {
  id: number;
  name: string;
};
```

と、

```typescript
const UserSchema = z.object({
  id: z.number(),
  name: z.string(),
});
```

を別々に定義すると、

```text
TypeScript
Zod
```

の定義がずれる可能性があります。

そこで今回はこちらを採用します。

```typescript
const UserSchema = ...

type User =
  z.infer<typeof UserSchema>;
```

つまり、

> SchemaをSingle Source of Truthにする

という考え方です。

---

# 11. FastifyとZodを接続する

FastifyにはType Providerという仕組みがあります。

最新のFastifyではZod向けに、

```text
@fastify/type-provider-zod
```

が用意されています。

まず、

```text
src/app.ts
```

を作ります。

```typescript
import Fastify from "fastify";

import {
  serializerCompiler,
  validatorCompiler,
  type ZodTypeProvider,
} from "@fastify/type-provider-zod";

export function buildApp() {
  const app = Fastify({
    logger: true,
  });

  app.setValidatorCompiler(validatorCompiler);

  app.setSerializerCompiler(serializerCompiler);

  return app.withTypeProvider<ZodTypeProvider>();
}
```

Fastifyの公式ドキュメントでも、

```typescript
setValidatorCompiler();
setSerializerCompiler();
withTypeProvider();
```

という組み合わせが案内されています。

---

# 12. server.tsを変更する

```typescript
import { buildApp } from "./app.js";

const app = buildApp();

app.get("/", async () => {
  return {
    message: "Hello Fastify",
  };
});

await app.listen({
  port: 3000,
  host: "0.0.0.0",
});
```

これで、

```text
Fastify
+
Zod
+
TypeScript型推論
```

の準備ができました。

---

# 13. User Schemaを作る

```text
src/users/user.schema.ts
```

を作ります。

```typescript
import { z } from "zod";

export const UserSchema = z.object({
  id: z.number().int().positive(),

  name: z.string().min(1).max(100),

  email: z.email(),
});

export type User = z.infer<typeof UserSchema>;
```

ここで、

```typescript
z.number();
```

だけではなく、

```typescript
.int()
.positive()
```

まで指定しています。

つまり、

```text
整数
かつ
正数
```

のみ許可します。

---

# 14. CreateUserSchema

POST用のSchemaを作ります。

作成時には、

```text
id
```

はサーバー側で採番するので不要です。

```typescript
export const CreateUserSchema = UserSchema.omit({
  id: true,
});

export type CreateUser = z.infer<typeof CreateUserSchema>;
```

これは概念的には、

```typescript
type CreateUser = {
  name: string;
  email: string;
};
```

です。

前回学習した、

```typescript
Omit<User, "id">;
```

にかなり近いですが、

Zod Schema自体も変更できるところがポイントです。

---

# 15. UpdateUserSchema

更新用も作ります。

```typescript
export const UpdateUserSchema = CreateUserSchema.partial();

export type UpdateUser = z.infer<typeof UpdateUserSchema>;
```

これで、

```typescript
type UpdateUser = {
  name?: string;
  email?: string;
};
```

相当になります。

TypeScriptの、

```typescript
Partial<T>;
```

と同じ考え方です。

---

# 16. Path Parameter Schema

`/users/:id`

の、

```text
:id
```

も検証します。

```typescript
export const UserParamsSchema = z.object({
  id: z.coerce.number().int().positive(),
});
```

ポイントは、

```typescript
z.coerce.number();
```

です。

HTTP URLから来る値は、

```text
/users/123
```

でも実際には文字列です。

```text
"123"
```

を、

```text
123
```

へ変換して検証します。

---

# 17. 最終的なuser.schema.ts

```typescript
import { z } from "zod";

export const UserSchema = z.object({
  id: z.number().int().positive(),

  name: z.string().min(1).max(100),

  email: z.email(),
});

export const CreateUserSchema = UserSchema.omit({
  id: true,
});

export const UpdateUserSchema = CreateUserSchema.partial();

export const UserParamsSchema = z.object({
  id: z.coerce.number().int().positive(),
});

export type User = z.infer<typeof UserSchema>;

export type CreateUser = z.infer<typeof CreateUserSchema>;

export type UpdateUser = z.infer<typeof UpdateUserSchema>;
```

---

# 18. Repositoryを作る

次にデータアクセス層です。

今回はDBを使わず、メモリ上に保存します。

```text
src/users/user.repository.ts
```

```typescript
import type { CreateUser, UpdateUser, User } from "./user.schema.js";

const users: User[] = [
  {
    id: 1,
    name: "Alice",
    email: "alice@example.com",
  },
  {
    id: 2,
    name: "Bob",
    email: "bob@example.com",
  },
];

let nextId = 3;
```

一覧取得：

```typescript
export async function findAllUsers(): Promise<User[]> {
  return users;
}
```

---

# 19. findById

```typescript
export async function findUserById(id: number): Promise<User | undefined> {
  return users.find((user) => user.id === id);
}
```

ここで、

```typescript
User | undefined;
```

になっています。

前回学習したUnion Typeです。

---

# 20. create

```typescript
export async function createUser(input: CreateUser): Promise<User> {
  const user: User = {
    id: nextId++,
    ...input,
  };

  users.push(user);

  return user;
}
```

ここで、

```typescript
...input
```

というJavaScript構文が登場します。

例えば、

```typescript
const input = {
  name: "Charlie",
  email: "charlie@example.com",
};
```

なら、

```typescript
const user = {
  id: 3,
  ...input,
};
```

は、

```typescript
{
  id: 3,
  name: "Charlie",
  email: "charlie@example.com"
}
```

になります。

これをSpread Syntaxと呼びます。

---

# 21. update

```typescript
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
```

ここでは、

```typescript
if (input.name !== undefined)
```

によってNarrowingしています。

---

# 22. delete

```typescript
export async function deleteUser(id: number): Promise<boolean> {
  const index = users.findIndex((user) => user.id === id);

  if (index === -1) {
    return false;
  }

  users.splice(index, 1);

  return true;
}
```

---

# 23. Repository完成版

```typescript
import type { CreateUser, UpdateUser, User } from "./user.schema.js";

const users: User[] = [
  {
    id: 1,
    name: "Alice",
    email: "alice@example.com",
  },
  {
    id: 2,
    name: "Bob",
    email: "bob@example.com",
  },
];

let nextId = 3;

export async function findAllUsers(): Promise<User[]> {
  return users;
}

export async function findUserById(id: number): Promise<User | undefined> {
  return users.find((user) => user.id === id);
}

export async function createUser(input: CreateUser): Promise<User> {
  const user: User = {
    id: nextId++,
    ...input,
  };

  users.push(user);

  return user;
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

export async function deleteUser(id: number): Promise<boolean> {
  const index = users.findIndex((user) => user.id === id);

  if (index === -1) {
    return false;
  }

  users.splice(index, 1);

  return true;
}
```

---

# 24. Service Layer

次にServiceを作ります。

小さなアプリならRepositoryをRouteから直接呼んでも構いません。

ただし今回は、

```text
Route
↓
Service
↓
Repository
```

という構成にします。

Goで、

```text
handler
usecase
repository
```

と分ける設計に近いです。

---

# 25. Serviceを作る

```text
src/users/user.service.ts
```

```typescript
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
```

今はServiceにロジックがほぼありません。

しかしDBや業務ロジックが増えれば、

```text
重複メールチェック
権限チェック
トランザクション
他Serviceとの連携
```

などをここに置けます。

---

# 26. GET /users

いよいよHTTP Routeを作ります。

```text
src/users/user.route.ts
```

```typescript
import type { FastifyPluginAsyncZod } from "@fastify/type-provider-zod";

import { UserSchema } from "./user.schema.js";

import { getUsers } from "./user.service.js";

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
};
```

---

# 27. Response Schema

ここが重要です。

```typescript
response: {
  200: UserSchema.array()
}
```

によって、

```text
HTTP 200
↓
User[]
```

というレスポンスSchemaを定義しています。

つまり、

```typescript
[
  {
    id: 1,
    name: "Alice",
    email: "alice@example.com",
  },
];
```

の形でなければなりません。

Fastifyではschemaをrequest validationだけでなくresponse serializationにも利用できます。

---

# 28. Routeを登録する

`app.ts`を変更します。

```typescript
import Fastify from "fastify";

import {
  serializerCompiler,
  validatorCompiler,
  type ZodTypeProvider,
} from "@fastify/type-provider-zod";

import { userRoutes } from "./users/user.route.js";

export function buildApp() {
  const app = Fastify({
    logger: true,
  });

  app.setValidatorCompiler(validatorCompiler);

  app.setSerializerCompiler(serializerCompiler);

  const typedApp = app.withTypeProvider<ZodTypeProvider>();

  typedApp.register(userRoutes);

  return typedApp;
}
```

---

# 29. GET /usersを試す

```bash
curl http://localhost:3000/users
```

結果：

```json
[
  {
    "id": 1,
    "name": "Alice",
    "email": "alice@example.com"
  },
  {
    "id": 2,
    "name": "Bob",
    "email": "bob@example.com"
  }
]
```

---

# 30. GET /users/:id

次に、

```text
GET /users/1
```

を作ります。

まずエラーSchemaも定義します。

`user.schema.ts`へ追加します。

```typescript
export const ErrorSchema = z.object({
  message: z.string(),
});
```

Route：

```typescript
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
```

---

# 31. request.paramsの型

ここで非常に重要です。

```typescript
const { id } = request.params;
```

こちらで、

```typescript
request.params.id;
```

の型は自動的に、

```typescript
number;
```

になります。

明示的に、

```typescript
type Params = {
  id: number;
};
```

とは書いていません。

なぜなら、

```typescript
params: UserParamsSchema;
```

からFastify Type Providerが推論しているからです。

つまり、

```text
Zod Schema
      ↓
runtime validation
      ↓
TypeScript inference
```

がつながっています。

---

# 32. 不正なIDを送ってみる

例えば、

```bash
curl http://localhost:3000/users/abc
```

とします。

`abc`は、

```typescript
z.coerce.number().int().positive();
```

に違反します。

そのためhandlerまで到達する前にvalidation errorになります。

これがZodをHTTP boundaryに置く大きなメリットです。

---

# 33. POST /users

次にユーザー作成です。

```typescript
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
```

ここでも、

```typescript
request.body;
```

の型は自動的に、

```typescript
{
  name: string;
  email: string;
}
```

になります。

---

# 34. POSTを試す

```bash
curl \
  -X POST \
  http://localhost:3000/users \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Charlie",
    "email": "charlie@example.com"
  }'
```

結果：

```json
{
  "id": 3,
  "name": "Charlie",
  "email": "charlie@example.com"
}
```

HTTP Statusは、

```text
201 Created
```

です。

---

# 35. Validation Errorを試す

例えば、

```bash
curl \
  -X POST \
  http://localhost:3000/users \
  -H "Content-Type: application/json" \
  -d '{
    "name": "",
    "email": "not-email"
  }'
```

とします。

Schemaでは、

```typescript
name: z.string().min(1);

email: z.email();
```

なのでvalidation errorになります。

これが、

```text
TypeScriptの型安全
+
runtimeの入力安全
```

の違いです。

---

# 36. PUT /users/:id

更新APIです。

```typescript
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
```

---

# 37. PUTを試す

```bash
curl \
  -X PUT \
  http://localhost:3000/users/1 \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Alice Smith"
  }'
```

結果：

```json
{
  "id": 1,
  "name": "Alice Smith",
  "email": "alice@example.com"
}
```

`UpdateUserSchema`には、

```typescript
.partial()
```

を指定しているので、

```json
{
  "name": "Alice Smith"
}
```

だけでもOKです。

---

# 38. DELETE /users/:id

```typescript
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

    return reply.code(204).send();
  },
);
```

成功時は、

```text
204 No Content
```

です。

---

# 39. user.route.ts完成版

```typescript
import { z } from "zod";

import type { FastifyPluginAsyncZod } from "@fastify/type-provider-zod";

import {
  CreateUserSchema,
  ErrorSchema,
  UpdateUserSchema,
  UserParamsSchema,
  UserSchema,
} from "./user.schema.js";

import {
  addUser,
  editUser,
  getUser,
  getUsers,
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
      const user = await getUser(request.params.id);

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
      const user = await editUser(request.params.id, request.body);

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

      return reply.code(204).send();
    },
  );
};
```

---

# 40. アプリケーション全体

最終的な構造です。

```text
src/
├── app.ts
├── server.ts
│
└── users/
    ├── user.schema.ts
    ├── user.repository.ts
    ├── user.service.ts
    └── user.route.ts
```

依存方向は、

```text
HTTP
 │
 ▼
user.route.ts
 │
 ▼
user.service.ts
 │
 ▼
user.repository.ts
```

Schemaは、

```text
user.schema.ts
```

をRoute / Service / Repositoryから共有します。

---

# 41. Goで考えると

今回の構成をGoで考えると、

```text
user.route.ts
```

は、

```text
handler
```

相当です。

```text
user.service.ts
```

は、

```text
usecase
service
```

相当。

```text
user.repository.ts
```

はそのまま、

```text
repository
```

です。

```text
user.schema.ts
```

は少し特殊で、

```text
DTO
+
validator
+
schema
```

をまとめた役割に近いです。

---

# 42. C#で考えると

C# / ASP.NET Coreなら、

```text
Fastify Route
≈ Controller / Minimal API

Service
≈ Application Service

Repository
≈ Repository

Zod Schema
≈ DTO + DataAnnotations
```

くらいの対応になります。

ただしZodでは、

```typescript
z.infer<typeof Schema>;
```

によって、

```text
DTOのRuntime Validation
+
Compile-time Type
```

を同じ定義から得られる点が特徴です。

---

# 43. なぜZodを使うのか

TypeScriptだけなら、

```typescript
type CreateUser = {
  name: string;
  email: string;
};
```

とできます。

しかしHTTP Requestは外部入力です。

そのため、

```text
TypeScript
```

だけでは不十分です。

例えば、

```typescript
request.body;
```

に本当に、

```typescript
{
  name: string;
  email: string;
}
```

が来た保証はruntimeにはありません。

Zodなら、

```typescript
const CreateUserSchema = z.object({
  name: z.string(),
  email: z.email(),
});
```

によって、

```text
HTTP JSON
↓
Zod validation
↓
型安全なTypeScript
```

という境界を作れます。

---

# 44. Boundary Validationという考え方

実務ではこの考え方が重要です。

システムの境界で、

```text
HTTP Request
Database Result
Environment Variables
External API
Message Queue
JSON File
```

などを検証します。

例えば、

```text
Internet
   ↓
Zod
   ↓
TypeScript domain
```

とします。

一度Zodを通した後は、

```typescript
CreateUser;
```

として安全に扱えます。

---

# 45. unknownから始めるイメージ

概念的には、

HTTPから来た値は、

```typescript
unknown;
```

だと考えるのが安全です。

```text
unknown
   ↓
Zod
   ↓
CreateUser
```

という流れです。

これは前回学習した、

```typescript
unknown;
```

の実践的な用途でもあります。

---

# 46. Schema Driven Design

今回かなり重要なのが、

```typescript
const CreateUserSchema = ...
```

を中心に設計していることです。

ここから、

```typescript
type CreateUser = z.infer<typeof CreateUserSchema>;
```

を生成します。

そのため、

```text
Schema
↓
Type
↓
HTTP Validation
↓
Route Type Inference
```

まで一貫しています。

---

# 47. Repository Interfaceを追加する

ここから少しGo/C#らしい設計へ進めます。

Repositoryをinterface化してみます。

```typescript
export interface UserRepository {
  findAll(): Promise<User[]>;

  findById(id: number): Promise<User | undefined>;

  create(input: CreateUser): Promise<User>;

  update(id: number, input: UpdateUser): Promise<User | undefined>;

  delete(id: number): Promise<boolean>;
}
```

Goなら、

```go
type UserRepository interface {
    FindAll(
        ctx context.Context,
    ) ([]User, error)
}
```

C#なら、

```csharp
public interface IUserRepository
{
    Task<List<User>> FindAll();
}
```

に近いです。

---

# 48. classでRepositoryを実装する

```typescript
export class InMemoryUserRepository implements UserRepository {
  private users: User[] = [
    {
      id: 1,
      name: "Alice",
      email: "alice@example.com",
    },
  ];

  private nextId = 2;

  async findAll(): Promise<User[]> {
    return this.users;
  }

  async findById(id: number): Promise<User | undefined> {
    return this.users.find((user) => user.id === id);
  }

  async create(input: CreateUser): Promise<User> {
    const user: User = {
      id: this.nextId++,
      ...input,
    };

    this.users.push(user);

    return user;
  }

  async update(id: number, input: UpdateUser): Promise<User | undefined> {
    const user = await this.findById(id);

    if (!user) {
      return undefined;
    }

    Object.assign(user, input);

    return user;
  }

  async delete(id: number): Promise<boolean> {
    const index = this.users.findIndex((user) => user.id === id);

    if (index === -1) {
      return false;
    }

    this.users.splice(index, 1);

    return true;
  }
}
```

---

# 49. Constructor Injection

Serviceをclassにします。

```typescript
export class UserService {
  constructor(private readonly repository: UserRepository) {}

  async getUsers() {
    return this.repository.findAll();
  }

  async getUser(id: number) {
    return this.repository.findById(id);
  }
}
```

これはC#の、

```csharp
public UserService(
    IUserRepository repository
)
```

とほぼ同じです。

Goなら、

```go
type UserService struct {
    repository UserRepository
}
```

です。

---

# 50. TypeScriptではclass必須ではない

ただし重要なのは、

```text
classを使わなければならない
```

わけではありません。

TypeScriptでは、

```typescript
function createUserService(repository: UserRepository) {
  return {
    getUsers() {
      return repository.findAll();
    },

    getUser(id: number) {
      return repository.findById(id);
    },
  };
}
```

でも構いません。

Goに慣れているなら、このfunctionalなスタイルもかなり自然です。

---

# 51. Fastify Plugin

今回、

```typescript
export const userRoutes:
  FastifyPluginAsyncZod =
  async app => {
```

という形にしました。

FastifyではRoute群をpluginとして分割するのが一般的です。

つまり、

```text
app
├── users plugin
├── appointments plugin
├── hospitals plugin
└── auth plugin
```

のようにできます。

---

# 52. prefixを使う

さらに、

```typescript
app.register(userRoutes, {
  prefix: "/api",
});
```

とすれば、

```text
GET /api/users
```

になります。

さらにRoute側を、

```typescript
"/users";
```

ではなく、

```typescript
"/";
```

にして、

```typescript
app.register(userRoutes, {
  prefix: "/api/users",
});
```

という設計もできます。

---

# 53. API Versioning

実務では、

```typescript
app.register(userRoutes, {
  prefix: "/api/v1/users",
});
```

として、

```text
/api/v1/users
```

にすることもよくあります。

---

# 54. エラーハンドリング

今は、

```typescript
if (!user) {
  return reply
    .code(404)
    .send(...)
}
```

としています。

アプリが大きくなると、

```typescript
throw new UserNotFoundError(id);
```

のようなApplication Errorを作る方法もあります。

例えば、

```typescript
export class UserNotFoundError extends Error {
  constructor(public readonly userId: number) {
    super(`User ${userId} not found`);
  }
}
```

---

# 55. Global Error Handler

Fastifyでは、

```typescript
app.setErrorHandler(async (error, request, reply) => {
  request.log.error(error);

  return reply.code(500).send({
    message: "Internal Server Error",
  });
});
```

のようにGlobal Error Handlerを設定できます。

実務では、

```text
Validation Error
Domain Error
Not Found
Database Error
Unknown Error
```

をここでHTTP Statusへ変換すると整理しやすくなります。

---

# 56. HTTP層とDomain層を分ける

例えばServiceで、

```typescript
reply.code(404);
```

を使うのは避けたほうがよいです。

なぜならServiceがHTTPに依存するからです。

良い依存方向は、

```text
HTTP
↓
Application
↓
Domain
↓
Repository abstraction
```

です。

Serviceでは、

```typescript
throw new UserNotFoundError(id);
```

HTTP層で、

```text
UserNotFoundError
↓
404
```

に変換します。

---

# 57. DBを入れる場合

次の段階ではRepositoryだけ入れ替えられます。

現在：

```text
UserService
    ↓
InMemoryUserRepository
```

DB導入後：

```text
UserService
    ↓
PostgresUserRepository
```

例えば、

```typescript
class PostgresUserRepository implements UserRepository {}
```

とします。

Service側は変更不要です。

---

# 58. PostgreSQLなら

TypeScriptでは例えば、

```text
postgres
Drizzle ORM
Kysely
Prisma
```

などの選択肢があります。

Goでsqlcを使う感覚に比較的近い方向を好むなら、

```text
Kysely
Drizzle
```

のようなSQL寄りのツールも学びやすいでしょう。

---

# 59. テスト

Fastifyには、

```typescript
app.inject();
```

という便利なテスト機能があります。

例えば、

```typescript
const response = await app.inject({
  method: "GET",
  url: "/users",
});
```

のように、

実際にTCP Portを開かずHTTP Routeをテストできます。

---

# 60. テスト例

```typescript
import { describe, it } from "node:test";

import assert from "node:assert/strict";

import { buildApp } from "./app.js";

describe("GET /users", () => {
  it("returns users", async () => {
    const app = buildApp();

    const response = await app.inject({
      method: "GET",
      url: "/users",
    });

    assert.equal(response.statusCode, 200);
  });
});
```

Node.js組み込みの、

```text
node:test
```

を使うこともできます。

---

# 61. 今回の重要ポイント

このチュートリアルで特に重要なのは次の流れです。

```text
HTTP JSON
   ↓
Zod Schema
   ↓
Validation
   ↓
TypeScript Type Inference
   ↓
Fastify Handler
   ↓
Service
   ↓
Repository
```

特に、

```typescript
schema: {
  body: CreateUserSchema;
}
```

を書くだけで、

```typescript
request.body;
```

が、

```typescript
{
  name: string;
  email: string;
}
```

になる点を確認してください。

---

# 62. Goとの大きな違い

Goでは、

```go
type CreateUserRequest struct {
    Name  string `json:"name"`
    Email string `json:"email"`
}
```

として、

```go
json.NewDecoder(...)
```

やValidatorを組み合わせることがあります。

TypeScript + Zodでは、

```typescript
const CreateUserSchema = z.object({
  name: z.string(),
  email: z.email(),
});
```

から、

```text
runtime validator
+
TypeScript type
```

の両方を得られます。

---

# 63. C#との大きな違い

ASP.NET Coreなら、

```csharp
public record CreateUserRequest(
    string Name,
    string Email
);
```

のように型自体がruntimeにも存在します。

TypeScriptでは、

```typescript
type CreateUser = ...
```

はruntimeでは消えます。

そのため、

```text
Zod
```

のようなruntime schemaが重要になります。

---

# 64. まず覚えるべきFastifyの5要素

最初は次だけ覚えれば十分です。

```typescript
app.get();
```

Route。

```typescript
request.params;
```

Path Parameter。

```typescript
request.query;
```

Query Parameter。

```typescript
request.body;
```

Request Body。

```typescript
reply.code().send();
```

Response。

---

# 65. まず覚えるべきZodの5要素

```typescript
z.string();
```

```typescript
z.number();
```

```typescript
z.object();
```

```typescript
.optional()
```

```typescript
z.infer<typeof Schema>;
```

まずはここからで十分です。

次に、

```text
union
enum
array
nullable
transform
refine
coerce
```

へ進めばよいでしょう。

---

# 66. 最終確認

APIを順番に実行します。

一覧：

```bash
curl \
  http://localhost:3000/users
```

取得：

```bash
curl \
  http://localhost:3000/users/1
```

登録：

```bash
curl \
  -X POST \
  http://localhost:3000/users \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Charlie",
    "email": "charlie@example.com"
  }'
```

更新：

```bash
curl \
  -X PUT \
  http://localhost:3000/users/1 \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Alice Smith"
  }'
```

削除：

```bash
curl \
  -X DELETE \
  http://localhost:3000/users/1
```

---

# 67. 次に進むなら

ここまで理解できたら、次はInMemory Repositoryをやめて、

```text
TypeScript
Fastify
Zod
PostgreSQL
Drizzle または Kysely
Docker Compose
Migration
Integration Test
OpenAPI
```

まで進めると、かなり実務的なバックエンドになります。

最終的には、

```text
HTTP
  ↓
Fastify
  ↓
Zod
  ↓
Route
  ↓
Service
  ↓
Repository
  ↓
PostgreSQL
```

という構成を作ります。

この段階まで来ると、GoやC#で普段作っているバックエンドアプリケーションと同じ感覚でTypeScriptを扱えるようになります。
