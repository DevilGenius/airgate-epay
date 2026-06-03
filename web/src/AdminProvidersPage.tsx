import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  api,
  type ProviderFieldDescriptor,
  type ProviderItem,
  type ProviderKindMeta,
} from './api';
import {
  Button,
  FormField,
  MethodChips,
  MethodMultiSelect,
  Modal,
  PageShell,
  Panel,
  PlusIcon,
  RefreshIcon,
  StatusBadge,
  Switch,
  TableState,
} from './admin-ui';
import { useToast } from './Toast';

type PluginConfirmOptions = { title?: string; danger?: boolean };

interface EditingState {
  mode: 'create' | 'edit';
  id: string;
  originalId?: string;
  kind: string;
  enabled: boolean;
  config: Record<string, string>;
}

function pluginConfirm(message: string, options?: PluginConfirmOptions): Promise<boolean> {
  const host = window as unknown as {
    airgate?: { confirm?: (message: string, options?: PluginConfirmOptions) => Promise<boolean> };
  };
  if (host.airgate?.confirm) return host.airgate.confirm(message, options);
  return Promise.resolve(window.confirm(message));
}

export default function AdminProvidersPage() {
  const [providers, setProviders] = useState<ProviderItem[]>([]);
  const [kinds, setKinds] = useState<ProviderKindMeta[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [editing, setEditing] = useState<EditingState | null>(null);
  const { toast, Toaster } = useToast();

  const reload = useCallback(() => {
    setLoading(true);
    setErr(null);
    api.adminListProviders()
      .then((res) => {
        setProviders(res.providers || []);
        setKinds(res.kinds || []);
      })
      .catch((error) => setErr(errorMessage(error)))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  const handleAdd = (kindMeta: ProviderKindMeta) => {
    setEditing({
      mode: 'create',
      id: '',
      kind: kindMeta.kind,
      enabled: true,
      config: defaultConfigFor(kindMeta),
    });
  };

  const handleEdit = (item: ProviderItem) => {
    setEditing({
      mode: 'edit',
      id: item.id,
      originalId: item.id,
      kind: item.kind,
      enabled: item.enabled,
      config: { ...item.config },
    });
  };

  const handleDelete = async (id: string) => {
    const confirmed = await pluginConfirm(`确认删除服务商 ${id}？此操作无法撤销。`, {
      title: '删除服务商',
      danger: true,
    });
    if (!confirmed) return;

    try {
      await api.adminDeleteProvider(id);
      toast.success(`已删除 ${id}`);
      reload();
    } catch (error) {
      toast.error(`删除失败: ${errorMessage(error)}`);
    }
  };

  const handleToggle = async (item: ProviderItem) => {
    try {
      await api.adminUpsertProvider({
        id: item.id,
        kind: item.kind,
        enabled: !item.enabled,
        config: item.config,
      });
      toast.success(`${item.id} 已${!item.enabled ? '启用' : '禁用'}`);
      reload();
    } catch (error) {
      toast.error(`操作失败: ${errorMessage(error)}`);
    }
  };

  return (
    <PageShell>
      {Toaster}
      <div className="ag-epay-page-body">
        <Panel
          title="添加服务商"
          description="同一种服务商类型可创建多个实例，用于多商户号、主备路由或不同支付渠道配置。"
        >
          {err ? (
            <TableState tone="danger">加载失败: {err}</TableState>
          ) : loading && kinds.length === 0 ? (
            <TableState>加载中...</TableState>
          ) : kinds.length === 0 ? (
            <TableState>暂无可添加的服务商类型</TableState>
          ) : (
            <div className="ag-epay-kind-grid">
              {kinds.map((kind) => (
                <div key={kind.kind} className="ag-epay-kind-card">
                  <div>
                    <div className="ag-epay-kind-title">{kind.name}</div>
                    <div className="ag-epay-provider-meta">{kind.kind}</div>
                  </div>
                  <div className="ag-epay-kind-description">{kind.description}</div>
                  <MethodChips format={methodLabel} methods={kind.supported_methods} />
                  <Button variant="primary" onClick={() => handleAdd(kind)}>
                    <PlusIcon className="ag-epay-icon" />
                    添加
                  </Button>
                </div>
              ))}
            </div>
          )}
        </Panel>

        <Panel
          actions={(
            <Button disabled={loading} iconOnly onClick={reload} title="刷新">
              <RefreshIcon className={loading ? 'ag-epay-icon ag-epay-spin' : 'ag-epay-icon'} />
            </Button>
          )}
          title="已配置的服务商实例"
        >
          <div className="ag-epay-table-shell">
            <div className="ag-epay-table-scroll">
              <table aria-label="支付服务商" className="ag-epay-table ag-epay-providers-table" data-slot="table">
                <thead data-slot="thead">
                  <tr data-slot="tr">
                    <th data-slot="th" scope="col">实例</th>
                    <th data-slot="th" scope="col">类型</th>
                    <th data-slot="th" scope="col">支付方式</th>
                    <th data-slot="th" scope="col">启用状态</th>
                    <th data-slot="th" scope="col">运行状态</th>
                    <th data-slot="th" scope="col">操作</th>
                  </tr>
                </thead>
                <tbody data-slot="tbody">
                  {renderProvidersTable({
                    err,
                    loading,
                    providers,
                    onDelete: handleDelete,
                    onEdit: handleEdit,
                    onToggle: handleToggle,
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </Panel>

        {editing ? (
          <EditProviderModal
            editing={editing}
            kinds={kinds}
            onCancel={() => setEditing(null)}
            onError={(message) => toast.error(message)}
            onSaved={(message) => {
              setEditing(null);
              toast.success(message);
              reload();
            }}
          />
        ) : null}
      </div>
    </PageShell>
  );
}

function renderProvidersTable({
  err,
  loading,
  onDelete,
  onEdit,
  onToggle,
  providers,
}: {
  err: string | null;
  loading: boolean;
  onDelete: (id: string) => void;
  onEdit: (item: ProviderItem) => void;
  onToggle: (item: ProviderItem) => void;
  providers: ProviderItem[];
}) {
  if (err) {
    return (
      <tr className="ag-epay-table-empty-row" data-slot="tr">
        <td colSpan={6} data-slot="td">
          <TableState tone="danger">加载失败: {err}</TableState>
        </td>
      </tr>
    );
  }

  if (loading && providers.length === 0) {
    return (
      <tr className="ag-epay-table-empty-row" data-slot="tr">
        <td colSpan={6} data-slot="td">
          <TableState>加载中...</TableState>
        </td>
      </tr>
    );
  }

  if (providers.length === 0) {
    return (
      <tr className="ag-epay-table-empty-row" data-slot="tr">
        <td colSpan={6} data-slot="td">
          <TableState>暂未配置任何服务商</TableState>
        </td>
      </tr>
    );
  }

  return providers.map((provider) => {
    const running = provider.is_running;
    return (
      <tr key={provider.id} data-slot="tr">
        <td data-slot="td">
          <div className="ag-epay-provider-name">{provider.name || provider.id}</div>
          <div className="ag-epay-provider-meta">{provider.id}</div>
        </td>
        <td data-slot="td">
          <code className="ag-epay-code">{provider.kind}</code>
        </td>
        <td data-slot="td">
          <MethodChips format={methodLabel} methods={provider.supported_methods} />
        </td>
        <td data-slot="td">
          <StatusBadge tone={provider.enabled ? 'success' : 'muted'}>
            {provider.enabled ? '已启用' : '已禁用'}
          </StatusBadge>
        </td>
        <td data-slot="td">
          <StatusBadge tone={running ? 'success' : provider.enabled ? 'warning' : 'muted'}>
            {running ? '运行中' : provider.enabled ? '未就绪' : '未参与'}
          </StatusBadge>
        </td>
        <td data-slot="td">
          <div className="ag-epay-table-actions">
            <Button onClick={() => onEdit(provider)}>编辑</Button>
            <Button onClick={() => onToggle(provider)}>{provider.enabled ? '禁用' : '启用'}</Button>
            <Button variant="danger" onClick={() => onDelete(provider.id)}>删除</Button>
          </div>
        </td>
      </tr>
    );
  });
}

function EditProviderModal({
  editing,
  kinds,
  onCancel,
  onError,
  onSaved,
}: {
  editing: EditingState;
  kinds: ProviderKindMeta[];
  onCancel: () => void;
  onError: (message: string) => void;
  onSaved: (message: string) => void;
}) {
  const [state, setState] = useState<EditingState>(editing);
  const [saving, setSaving] = useState(false);
  const meta = useMemo(() => kinds.find((kind) => kind.kind === state.kind), [kinds, state.kind]);

  const setConfigValue = (key: string, value: string) => {
    setState((current) => ({
      ...current,
      config: {
        ...current.config,
        [key]: value,
      },
    }));
  };

  const handleSave = async () => {
    if (!meta) {
      onError('未知的服务商类型');
      return;
    }

    for (const field of meta.field_descriptors) {
      if (field.required && !state.config[field.key]) {
        onError(`「${field.label}」必填`);
        return;
      }
    }

    const nextId = state.id.trim();
    if (state.mode === 'edit' && state.originalId && nextId !== state.originalId) {
      const confirmed = await pluginConfirm(
        `确认将实例 ID 从「${state.originalId}」重命名为「${nextId}」？\n\n` +
          '所有历史订单的 provider_id 引用会在事务里同步更新；如果第三方支付平台已有待回调订单，旧回调路径会失效。',
        { title: '重命名服务商 ID', danger: true },
      );
      if (!confirmed) return;
    }

    setSaving(true);
    try {
      const res = await api.adminUpsertProvider({
        id: nextId,
        original_id: state.originalId,
        kind: state.kind,
        enabled: state.enabled,
        config: state.config,
      });
      const finalID = res.id || nextId;
      onSaved(state.mode === 'create' ? `已创建 ${finalID}` : `已更新 ${finalID}`);
    } catch (error) {
      onError(`保存失败: ${errorMessage(error)}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      description={state.mode === 'edit'
        ? '修改服务商凭证、启用状态或实例 ID。修改 ID 会同步更新历史订单引用。'
        : '配置新的支付服务商实例。实例 ID 可留空，由后端自动生成。'}
      footer={(
        <>
          <Button disabled={saving} onClick={onCancel}>取消</Button>
          <Button disabled={saving} onClick={handleSave} variant="primary">
            {saving ? '保存中...' : '保存'}
          </Button>
        </>
      )}
      onClose={onCancel}
      title={`${state.mode === 'create' ? '添加' : '编辑'}服务商 - ${meta?.name || state.kind}`}
    >
      <FormField
        description={state.mode === 'edit'
          ? '可修改。改名时后端会在事务中同步更新所有历史订单的 provider_id 引用。'
          : '可选。留空自动生成，也可以填写 xunhu_main / xunhu_backup 这类便于识别的名称。'}
        label="实例 ID"
      >
        <input
          className="ag-epay-control ag-epay-input ag-epay-control--mono"
          onChange={(event) => setState({ ...state, id: event.target.value })}
          placeholder={state.mode === 'create' ? '留空自动生成' : ''}
          type="text"
          value={state.id}
        />
      </FormField>

      <FormField label="启用状态">
        <Switch
          checked={state.enabled}
          label="启用后该实例会参与支付路由"
          onChange={(checked) => setState({ ...state, enabled: checked })}
        />
      </FormField>

      {meta?.field_descriptors.map((field) => (
        <ProviderConfigField
          key={field.key}
          field={field}
          meta={meta}
          onChange={(value) => setConfigValue(field.key, value)}
          value={state.config[field.key] || ''}
        />
      ))}
    </Modal>
  );
}

function ProviderConfigField({
  field,
  meta,
  onChange,
  value,
}: {
  field: ProviderFieldDescriptor;
  meta: ProviderKindMeta;
  onChange: (value: string) => void;
  value: string;
}) {
  return (
    <FormField description={field.description} label={field.label} required={field.required}>
      {renderProviderInput({ field, meta, onChange, value })}
    </FormField>
  );
}

function renderProviderInput({
  field,
  meta,
  onChange,
  value,
}: {
  field: ProviderFieldDescriptor;
  meta: ProviderKindMeta;
  onChange: (value: string) => void;
  value: string;
}) {
  if (field.type === 'textarea') {
    return (
      <textarea
        className="ag-epay-control ag-epay-textarea ag-epay-control--mono"
        onChange={(event) => onChange(event.target.value)}
        placeholder={field.placeholder}
        value={value}
      />
    );
  }

  if (field.type === 'bool') {
    return (
      <Switch
        checked={value === 'true'}
        label={value === 'true' ? '已开启' : '已关闭'}
        onChange={(checked) => onChange(checked ? 'true' : 'false')}
      />
    );
  }

  if (field.type === 'method-multi') {
    return (
      <MethodMultiSelect
        candidates={meta.supported_methods}
        format={methodLabel}
        onChange={onChange}
        value={value}
      />
    );
  }

  return (
    <input
      className="ag-epay-control ag-epay-input"
      onChange={(event) => onChange(event.target.value)}
      placeholder={field.placeholder}
      type={field.type === 'password' ? 'password' : field.type === 'number' ? 'number' : 'text'}
      value={value}
    />
  );
}

function defaultConfigFor(meta: ProviderKindMeta): Record<string, string> {
  const config: Record<string, string> = {};
  for (const field of meta.field_descriptors) {
    config[field.key] = field.type === 'bool' ? 'false' : '';
  }
  return config;
}

function methodLabel(method: string): string {
  return ({ alipay: '支付宝', wxpay: '微信支付', qqpay: 'QQ 钱包' } as Record<string, string>)[method] || method;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
