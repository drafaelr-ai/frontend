// src/App.js
import React, { useEffect, useMemo, useState } from "react";

/**
 * ============================
 * Config
 * ============================
 */
const API_URL =
     process.env.REACT_APP_API_URL ||
     process.env.VITE_API_URL ||
     "https://backend-production-78c9.up.railway.app";

/**
 * ============================
 * Helpers
 * ============================
 */
function formatCurrency(v) {
  const n = Number(v || 0);
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}
function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

/**
 * ============================
 * App
 * ============================
 */
export default function App() {
  /**
   * Estados principais
   */
  const [obras, setObras] = useState([]);
  const [obraSelecionada, setObraSelecionada] = useState(null);
  const [historico, setHistorico] = useState([]);
  const [resumo, setResumo] = useState(null);

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // Form de criação de Obra
  const [novaObra, setNovaObra] = useState({ nome: "", cliente: "" });

  // Form de criação de Gasto (lançamento)
  const [form, setForm] = useState({
    descricao: "",
    tipo: "Material", // Material | Mão de Obra | Serviço | Equipamentos
    valor: "",
    data: todayISO(),
    status: "A Pagar", // "A Pagar" | "Pago"
    pix: "",
    prioridade: 5, // só é enviado quando status === "A Pagar"
  });

  /**
   * ============================
   * Carregamento inicial de Obras
   * ============================
   */
  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const r = await fetch(`${API_URL}/obras`);
        if (!r.ok) throw new Error(`Falha ao buscar obras: ${r.status}`);
        const data = await r.json();
        setObras(data);
      } catch (e) {
        setErrorMsg(e.message || "Erro ao carregar obras");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  /**
   * ============================
   * Selecionar Obra → carrega detalhes
   * ============================
   */
  async function handleSelecionarObra(obra) {
    try {
      setLoading(true);
      setErrorMsg("");
      setObraSelecionada(obra);
      const r = await fetch(`${API_URL}/obras/${obra.id}`);
      if (!r.ok) throw new Error(`Falha ao buscar detalhes: ${r.status}`);
      const data = await r.json();
      setHistorico(Array.isArray(data.historico) ? data.historico : []);
      setResumo(data.resumo || null);
    } catch (e) {
      setErrorMsg(e.message || "Erro ao carregar obra");
    } finally {
      setLoading(false);
    }
  }

  /**
   * ============================
   * CRUD de Obras
   * ============================
   */
  async function handleAddObra(e) {
    e.preventDefault();
    try {
      setErrorMsg("");
      const payload = {
        nome: (novaObra.nome || "").trim(),
        cliente: (novaObra.cliente || "").trim() || null,
      };
      if (!payload.nome) {
        setErrorMsg("Informe o nome da obra.");
        return;
      }

      setLoading(true);
      const r = await fetch(`${API_URL}/obras`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!r.ok) throw new Error(`Falha ao criar obra: ${r.status}`);
      const nova = await r.json();
      setObras((prev) => [nova, ...prev]);
      setNovaObra({ nome: "", cliente: "" });
    } catch (e) {
      setErrorMsg(e.message || "Erro ao criar obra");
    } finally {
      setLoading(false);
    }
  }

  async function handleExcluirObra(obra) {
    if (!window.confirm(`Excluir a obra "${obra.nome}"?`)) return;
    try {
      setLoading(true);
      setErrorMsg("");
      const r = await fetch(`${API_URL}/obras/${obra.id}`, { method: "DELETE" });
      if (!r.ok) throw new Error(`Falha ao excluir: ${r.status}`);
      setObras((prev) => prev.filter((o) => o.id !== obra.id));
      if (obraSelecionada?.id === obra.id) {
        setObraSelecionada(null);
        setHistorico([]);
        setResumo(null);
      }
    } catch (e) {
      setErrorMsg(e.message || "Erro ao excluir obra");
    } finally {
      setLoading(false);
    }
  }

  /**
   * ============================
   * Handlers do formulário de gasto
   * ============================
   */
  function handleChange(e) {
    const { name, value } = e.target;
    setForm((prev) => {
      if (name === "status") {
        return {
          ...prev,
          status: value,
          prioridade: value === "A Pagar" ? prev.prioridade ?? 5 : undefined,
        };
      }
      if (name === "prioridade") {
        const n = Math.max(0, Math.min(5, Number(value)));
        return { ...prev, prioridade: Number.isFinite(n) ? n : 5 };
      }
      return { ...prev, [name]: value };
    });
  }

  function resetFormGasto() {
    setForm({
      descricao: "",
      tipo: "Material",
      valor: "",
      data: todayISO(),
      status: "A Pagar",
      pix: "",
      prioridade: 5,
    });
  }

  /**
   * ============================
   * Criar Gasto (Lançamento)
   * ============================
   */
  async function handleAddGasto(e) {
    e.preventDefault();
    if (!obraSelecionada) {
      setErrorMsg("Selecione uma obra antes de adicionar um gasto.");
      return;
    }
    try {
      setLoading(true);
      setErrorMsg("");

      const payload = {
        descricao: (form.descricao || "").trim(),
        tipo: form.tipo,
        valor: Number(form.valor || 0),
        data: form.data,
        status: form.status,
        pix: form.pix || "",
      };
      if (payload.status === "A Pagar") {
        payload.prioridade = Number(form.prioridade ?? 5);
      }

      if (!payload.descricao) throw new Error("Descrição é obrigatória.");
      if (!payload.valor || isNaN(payload.valor))
        throw new Error("Valor inválido.");

      const r = await fetch(
        `${API_URL}/obras/${obraSelecionada.id}/lancamentos`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );
      if (!r.ok) throw new Error(`Falha ao salvar gasto: ${r.status}`);
      const novo = await r.json();

      // Atualiza histórico local (exibição)
      const item = {
        id: `lanc-${novo.id}`,
        tipo_registro: "lancamento",
        data: novo.data,
        descricao: novo.descricao,
        tipo: novo.tipo,
        valor: novo.valor,
        status: novo.status,
        pix: novo.pix,
        prioridade: novo.prioridade ?? null,
      };
      setHistorico((prev) => [item, ...prev]);
      resetFormGasto();
    } catch (e) {
      setErrorMsg(e.message || "Erro ao adicionar gasto");
    } finally {
      setLoading(false);
    }
  }

  /**
   * ============================
   * Derivados
   * ============================
   */
  const historicoOrdenado = useMemo(() => {
    const arr = Array.isArray(historico) ? [...historico] : [];
    // Ordena por data desc
    arr.sort((a, b) => String(b.data).localeCompare(String(a.data)));
    return arr;
  }, [historico]);

  /**
   * ============================
   * UI
   * ============================
   */
  return (
    <div style={{ maxWidth: 1100, margin: "0 auto", padding: 20 }}>
      <h1 style={{ marginBottom: 24 }}>Minhas Obras</h1>

      {/* Mensagens */}
      {errorMsg && (
        <div
          style={{
            background: "#ffe8e8",
            border: "1px solid #f5b5b5",
            color: "#b00000",
            padding: 10,
            borderRadius: 6,
            marginBottom: 16,
          }}
        >
          {errorMsg}
        </div>
      )}
      {loading && (
        <div
          style={{
            background: "#eef6ff",
            border: "1px solid #b6d4fe",
            color: "#0b5ed7",
            padding: 10,
            borderRadius: 6,
            marginBottom: 16,
          }}
        >
          Carregando...
        </div>
      )}

      {/* Cadastro de nova obra */}
      <section
        style={{
          border: "1px solid #e5e7eb",
          borderRadius: 8,
          padding: 16,
          marginBottom: 24,
          background: "#fff",
        }}
      >
        <h3 style={{ marginTop: 0, marginBottom: 12 }}>Cadastrar Nova Obra</h3>
        <form onSubmit={handleAddObra} style={{ display: "flex", gap: 8 }}>
          <input
            placeholder="Nome da Obra"
            value={novaObra.nome}
            onChange={(e) =>
              setNovaObra((p) => ({ ...p, nome: e.target.value }))
            }
            style={{ flex: 1, padding: 10 }}
          />
          <input
            placeholder="Nome do Cliente"
            value={novaObra.cliente}
            onChange={(e) =>
              setNovaObra((p) => ({ ...p, cliente: e.target.value }))
            }
            style={{ flex: 1, padding: 10 }}
          />
          <button type="submit" style={{ padding: "10px 14px" }}>
            Adicionar Obra
          </button>
        </form>
      </section>

      {/* Lista de obras */}
      <section
        style={{
          border: "1px solid #e5e7eb",
          borderRadius: 8,
          padding: 16,
          background: "#fff",
          marginBottom: 24,
        }}
      >
        <h3 style={{ marginTop: 0, marginBottom: 12 }}>Obras</h3>
        {obras.length === 0 ? (
          <p style={{ margin: 0 }}>Nenhuma obra cadastrada.</p>
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr auto",
              gap: 8,
              alignItems: "center",
            }}
          >
            {obras.map((o) => (
              <div
                key={o.id}
                style={{
                  display: "contents",
                }}
              >
                <button
                  onClick={() => handleSelecionarObra(o)}
                  style={{
                    textAlign: "left",
                    padding: 10,
                    background:
                      obraSelecionada?.id === o.id ? "#eef6ff" : "#f9fafb",
                    border: "1px solid #e5e7eb",
                    borderRadius: 6,
                    cursor: "pointer",
                  }}
                  title="Abrir obra"
                >
                  <strong>{o.nome}</strong>
                  {o.cliente ? <span> — Cliente: {o.cliente}</span> : null}
                </button>
                <button
                  onClick={() => handleExcluirObra(o)}
                  style={{
                    padding: "8px 12px",
                    background: "#fee2e2",
                    border: "1px solid #fecaca",
                    color: "#991b1b",
                    borderRadius: 6,
                    cursor: "pointer",
                  }}
                  title="Excluir obra"
                >
                  Excluir
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Detalhe da obra selecionada */}
      {obraSelecionada && (
        <>
          {/* Form de novo gasto */}
          <section
            style={{
              border: "1px solid #e5e7eb",
              borderRadius: 8,
              padding: 16,
              background: "#fff",
              marginBottom: 24,
            }}
          >
            <h3 style={{ marginTop: 0, marginBottom: 12 }}>
              Novo Gasto — {obraSelecionada.nome}
            </h3>
            <form
              onSubmit={handleAddGasto}
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(6, 1fr)",
                gap: 8,
                alignItems: "center",
              }}
            >
              <input
                name="descricao"
                placeholder="Descrição"
                value={form.descricao}
                onChange={handleChange}
                style={{ gridColumn: "1 / span 2", padding: 10 }}
                required
              />
              <select
                name="tipo"
                value={form.tipo}
                onChange={handleChange}
                style={{ padding: 10 }}
              >
                <option>Material</option>
                <option>Mão de Obra</option>
                <option>Serviço</option>
                <option>Equipamentos</option>
              </select>

              <input
                name="valor"
                type="number"
                step="0.01"
                placeholder="Valor (R$)"
                value={form.valor}
                onChange={handleChange}
                style={{ padding: 10 }}
                required
              />
              <input
                name="data"
                type="date"
                value={form.data}
                onChange={handleChange}
                style={{ padding: 10 }}
                required
              />

              <select
                name="status"
                value={form.status}
                onChange={handleChange}
                style={{ padding: 10 }}
              >
                <option value="A Pagar">A Pagar</option>
                <option value="Pago">Pago</option>
              </select>

              {/* Prioridade: só quando A Pagar */}
              {form.status === "A Pagar" ? (
                <input
                  name="prioridade"
                  type="number"
                  min={0}
                  max={5}
                  value={form.prioridade ?? 5}
                  onChange={handleChange}
                  style={{ padding: 10 }}
                  placeholder="Prioridade (0-5)"
                  required
                />
              ) : (
                <div />
              )}

              <input
                name="pix"
                placeholder="Chave PIX (opcional)"
                value={form.pix}
                onChange={handleChange}
                style={{ gridColumn: "1 / span 3", padding: 10 }}
              />
              <div style={{ gridColumn: "span 3", textAlign: "right" }}>
                <button type="submit" style={{ padding: "10px 14px" }}>
                  Salvar Gasto
                </button>
              </div>
            </form>
          </section>

          {/* Resumo */}
          {resumo && (
            <section
              style={{
                border: "1px solid #e5e7eb",
                borderRadius: 8,
                padding: 16,
                background: "#fff",
                marginBottom: 24,
              }}
            >
              <h3 style={{ marginTop: 0, marginBottom: 12 }}>Resumo</h3>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(3, 1fr)",
                  gap: 12,
                }}
              >
                <div
                  style={{
                    background: "#eef6ff",
                    border: "1px solid #bfdbfe",
                    padding: 12,
                    borderRadius: 8,
                  }}
                >
                  <div style={{ color: "#1d4ed8" }}>Total Geral</div>
                  <div style={{ fontWeight: 700, fontSize: 18 }}>
                    {formatCurrency(resumo.total_geral)}
                  </div>
                </div>
                <div
                  style={{
                    background: "#ecfdf5",
                    border: "1px solid #a7f3d0",
                    padding: 12,
                    borderRadius: 8,
                  }}
                >
                  <div style={{ color: "#047857" }}>Total Pago</div>
                  <div style={{ fontWeight: 700, fontSize: 18 }}>
                    {formatCurrency(resumo.total_pago)}
                  </div>
                </div>
                <div
                  style={{
                    background: "#fef2f2",
                    border: "1px solid #fecaca",
                    padding: 12,
                    borderRadius: 8,
                  }}
                >
                  <div style={{ color: "#b91c1c" }}>Total a Pagar</div>
                  <div style={{ fontWeight: 700, fontSize: 18 }}>
                    {formatCurrency(resumo.total_a_pagar)}
                  </div>
                </div>
              </div>
            </section>
          )}

          {/* Histórico de Gastos */}
          <section
            style={{
              border: "1px solid #e5e7eb",
              borderRadius: 8,
              padding: 16,
              background: "#fff",
              marginBottom: 24,
            }}
          >
            <h3 style={{ marginTop: 0, marginBottom: 12 }}>
              Histórico de Gastos
            </h3>

            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr>
                    <th style={{ textAlign: "left", padding: 8 }}>Data</th>
                    <th style={{ textAlign: "left", padding: 8 }}>
                      Descrição
                    </th>
                    <th style={{ textAlign: "left", padding: 8 }}>Segmento</th>
                    <th style={{ textAlign: "left", padding: 8 }}>Status</th>
                    <th style={{ textAlign: "left", padding: 8 }}>
                      Prioridade
                    </th>
                    <th style={{ textAlign: "right", padding: 8 }}>Valor</th>
                  </tr>
                </thead>
                <tbody>
                  {historicoOrdenado.map((item) => (
                    <tr key={item.id}>
                      <td style={{ padding: 8 }}>{item.data}</td>
                      <td style={{ padding: 8 }}>{item.descricao}</td>
                      <td style={{ padding: 8 }}>{item.tipo}</td>
                      <td style={{ padding: 8 }}>
                        {item.status === "A Pagar" ? (
                          <span
                            style={{
                              display: "inline-block",
                              background: "#fee2e2",
                              color: "#991b1b",
                              border: "1px solid #fecaca",
                              borderRadius: 999,
                              padding: "2px 8px",
                              fontSize: 12,
                              fontWeight: 700,
                            }}
                          >
                            A Pagar
                          </span>
                        ) : (
                          <span
                            style={{
                              display: "inline-block",
                              background: "#dcfce7",
                              color: "#065f46",
                              border: "1px solid #86efac",
                              borderRadius: 999,
                              padding: "2px 8px",
                              fontSize: 12,
                              fontWeight: 700,
                            }}
                          >
                            PAGO
                          </span>
                        )}
                      </td>

                      {/* Prioridade apenas para lançamentos "A Pagar" */}
                      <td style={{ padding: 8 }}>
                        {item.tipo_registro === "lancamento" &&
                        item.status === "A Pagar"
                          ? typeof item.prioridade === "number"
                            ? item.prioridade
                            : 5
                          : "—"}
                      </td>

                      <td style={{ padding: 8, textAlign: "right" }}>
                        {formatCurrency(item.valor)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Caso não tenha histórico */}
            {(Array.isArray(historicoOrdenado) ? historicoOrdenado : []).length ===
              0 && (
              <p style={{ textAlign: "center", marginTop: 15 }}>
                Nenhum gasto ou pagamento registrado.
              </p>
            )}
          </section>
        </>
      )}
    </div>
  );
}
