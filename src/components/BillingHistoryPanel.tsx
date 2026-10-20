import { useEffect, useMemo, useState } from 'react';
import {
  DollarSign, ArrowDownLeft, ArrowUpRight, RefreshCw, Download,
  CreditCard, Filter, Wallet
} from 'lucide-react';
import {
  loadBillingHistory,
  billingTotals,
  exportBillingCsv,
  recordPayment,
  type BillingEntry,
} from '../services/billingHistory';

type FilterKind = 'all' | 'payment' | 'charge' | 'refund';

interface Props {
  language: 'ru' | 'en';
  currency: string;
  userId?: string;
}

export default function BillingHistoryPanel({ language, currency, userId }: Props) {
  const [entries, setEntries] = useState<BillingEntry[]>([]);
  const [filter, setFilter] = useState<FilterKind>('all');
  const [loading, setLoading] = useState(true);

  const money = (n: number) => {
    if (currency === 'USD') return `$${(n / 90).toFixed(2)}`;
    if (currency === 'CNY') return `¥${(n / 12).toFixed(2)}`;
    return `${n.toFixed(2)} ₽`;
  };

  const refresh = async () => {
    setLoading(true);
    const list = await loadBillingHistory(userId);
    setEntries(list);
    setLoading(false);
  };

  useEffect(() => {
    void refresh();
  }, [userId]);

  const totals = useMemo(() => billingTotals(entries), [entries]);

  const filtered = useMemo(() => {
    if (filter === 'all') return entries;
    return entries.filter(e => e.kind === filter);
  }, [entries, filter]);

  const kindLabel = (k: BillingEntry['kind']) =>
    k === 'payment'
      ? language === 'ru' ? 'Пополнение' : 'Top-up'
      : k === 'charge'
        ? language === 'ru' ? 'Списание' : 'Charge'
        : k === 'refund'
          ? language === 'ru' ? 'Возврат' : 'Refund'
          : language === 'ru' ? 'Бонус' : 'Bonus';

  return (
    <div className="space-y-6">
      {/* Totals */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-slate-100 p-4">
          <div className="flex items-center gap-2 text-slate-500 text-sm mb-1">
            <Wallet size={16} /> {language === 'ru' ? 'Баланс' : 'Balance'}
          </div>
          <p className="text-2xl font-bold text-slate-900">{money(totals.balance)}</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-100 p-4">
          <div className="flex items-center gap-2 text-green-600 text-sm mb-1">
            <ArrowDownLeft size={16} /> {language === 'ru' ? 'Пополнено' : 'Topped up'}
          </div>
          <p className="text-2xl font-bold text-green-700">{money(totals.toppedUp)}</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-100 p-4">
          <div className="flex items-center gap-2 text-orange-600 text-sm mb-1">
            <ArrowUpRight size={16} /> {language === 'ru' ? 'Списано' : 'Spent'}
          </div>
          <p className="text-2xl font-bold text-orange-700">{money(totals.spent)}</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-100 p-4">
          <div className="flex items-center gap-2 text-slate-500 text-sm mb-1">
            <CreditCard size={16} /> {language === 'ru' ? 'Операций' : 'Operations'}
          </div>
          <p className="text-2xl font-bold text-slate-900">{entries.length}</p>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 text-sm text-slate-600">
          <Filter size={16} />
          <select
            value={filter}
            onChange={e => setFilter(e.target.value as FilterKind)}
            className="border border-slate-200 rounded-lg px-3 py-2 text-sm"
          >
            <option value="all">{language === 'ru' ? 'Все операции' : 'All operations'}</option>
            <option value="payment">{language === 'ru' ? 'Пополнения' : 'Top-ups'}</option>
            <option value="charge">{language === 'ru' ? 'Списания' : 'Charges'}</option>
            <option value="refund">{language === 'ru' ? 'Возвраты' : 'Refunds'}</option>
          </select>
        </div>
        <button
          onClick={() => void refresh()}
          className="flex items-center gap-2 px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-700 hover:bg-slate-50"
        >
          <RefreshCw size={14} /> {language === 'ru' ? 'Обновить' : 'Refresh'}
        </button>
        <button
          onClick={() => exportBillingCsv(filtered)}
          className="flex items-center gap-2 px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-700 hover:bg-slate-50"
        >
          <Download size={14} /> CSV
        </button>
        {/* Demo top-up so the ledger is testable without YooKassa */}
        <button
          onClick={() => {
            recordPayment({
              amount: 5000,
              description: language === 'ru' ? 'Тестовое пополнение (демо)' : 'Demo top-up',
              method: 'demo',
              userId,
            });
            void refresh();
          }}
          className="ml-auto flex items-center gap-2 px-3 py-2 bg-orange-500 text-white rounded-lg text-sm font-medium hover:bg-orange-600"
        >
          <DollarSign size={14} /> {language === 'ru' ? 'Демо-пополнение' : 'Demo top-up'}
        </button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-100 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-slate-500 text-sm">
            {language === 'ru' ? 'Загрузка…' : 'Loading…'}
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center text-slate-500 text-sm">
            {language === 'ru'
              ? 'Операций пока нет. Пополните баланс или запустите рекламу — списания появятся здесь.'
              : 'No operations yet. Top up or run ads — charges will appear here.'}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50">
                <tr>
                  <th className="text-left p-4 text-sm font-medium text-slate-600">{language === 'ru' ? 'Дата' : 'Date'}</th>
                  <th className="text-left p-4 text-sm font-medium text-slate-600">{language === 'ru' ? 'Тип' : 'Type'}</th>
                  <th className="text-left p-4 text-sm font-medium text-slate-600">{language === 'ru' ? 'Кампания' : 'Campaign'}</th>
                  <th className="text-left p-4 text-sm font-medium text-slate-600">{language === 'ru' ? 'Способ' : 'Method'}</th>
                  <th className="text-left p-4 text-sm font-medium text-slate-600">{language === 'ru' ? 'Описание' : 'Description'}</th>
                  <th className="text-right p-4 text-sm font-medium text-slate-600">{language === 'ru' ? 'Сумма' : 'Amount'}</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(e => (
                  <tr key={e.id} className="border-t border-slate-50 hover:bg-slate-50">
                    <td className="p-4 text-sm text-slate-600 whitespace-nowrap">
                      {new Date(e.createdAt).toLocaleString(language === 'ru' ? 'ru-RU' : 'en-US', {
                        day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
                      })}
                    </td>
                    <td className="p-4">
                      <span className={`text-xs px-2 py-1 rounded-full ${
                        e.kind === 'payment' ? 'bg-green-50 text-green-700' :
                        e.kind === 'charge' ? 'bg-orange-50 text-orange-700' :
                        'bg-blue-50 text-blue-700'
                      }`}>
                        {kindLabel(e.kind)}
                      </span>
                    </td>
                    <td className="p-4 text-sm text-slate-800">{e.campaignTitle || e.campaignId || '—'}</td>
                    <td className="p-4 text-sm text-slate-600 uppercase text-xs">{e.method || '—'}</td>
                    <td className="p-4 text-sm text-slate-600 max-w-xs truncate">{e.description}</td>
                    <td className={`p-4 text-right font-semibold whitespace-nowrap ${e.amount >= 0 ? 'text-green-700' : 'text-orange-700'}`}>
                      {e.amount >= 0 ? '+' : ''}{money(e.amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <p className="text-xs text-slate-500">
        {language === 'ru'
          ? 'Списания формируются из показов и кликов (CPM/CPC/CPD) по активным кампаниям. Пополнения — через Яндекс.Оплату или демо-кнопку.'
          : 'Charges are generated from impressions and clicks (CPM/CPC/CPD). Top-ups go through YooKassa or the demo button.'}
      </p>
    </div>
  );
}
