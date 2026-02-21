/*
  Warnings:

  - A unique constraint covering the columns `[token_id]` on the table `jwt_tokens` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "jwt_tokens_token_id_key" ON "jwt_tokens"("token_id");
