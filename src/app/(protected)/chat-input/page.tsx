import { ChatParseForm } from "@/components/forms/chat-parse-form";
import { Card } from "@/components/shared/card";
import { PageHeader } from "@/components/shared/page-header";
import { getAccounts, getCategories } from "@/infrastructure/repositories/kakeibo-repository";

export default async function ChatInputPage() {
  const [accounts, categories] = await Promise.all([getAccounts(), getCategories()]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="自然文入力"
        description="自然文を明細候補に変換して、確認してから保存できます。"
      />
      <Card>
        <ChatParseForm accounts={accounts} categories={categories} />
      </Card>
    </div>
  );
}
