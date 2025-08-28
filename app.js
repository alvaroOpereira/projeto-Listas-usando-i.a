// --- Utilidades ---
    const $ = (sel, el = document) => el.querySelector(sel);
    const $$ = (sel, el = document) => Array.from(el.querySelectorAll(sel));
    const uid = () => Math.random().toString(36).slice(2, 10);

    const STORAGE_KEY = 'multiListApp.v1';
    const DEFAULT_STATE = {
      selectedListId: null,
      lists: []
    };

    function loadState(){
      try{
        const raw = localStorage.getItem(STORAGE_KEY);
        return raw ? JSON.parse(raw) : DEFAULT_STATE;
      }catch(e){
        console.warn('Falha ao carregar dados, iniciando vazio.', e);
        return DEFAULT_STATE;
      }
    }
    function saveState(){
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      renderSidebar();
      renderMain();
    }

    // --- Estado ---
    let state = loadState();
    if(state.lists.length === 0){
      // cria uma lista de demonstração
      const sampleId = uid();
      state = {
        selectedListId: sampleId,
        lists: [{
          id: sampleId,
          name: 'Exemplo: Mercado',
          items: [
            { id: uid(), text: 'Arroz 5kg', done:false },
            { id: uid(), text: 'Feijão preto 1kg', done:true },
            { id: uid(), text: 'Frango 2kg', done:false },
          ]
        }]
      };
      saveState();
    }

    // --- Referências ---
    const listsEl = $('#lists');
    const totalListsEl = $('#totalLists');
    const searchInput = $('#searchInput');
    const listTitle = $('#listTitle');
    const newListBtn = $('#newListBtn');
    const deleteListBtn = $('#deleteListBtn');
    const renameBtn = $('#renameBtn');
    const itemsEl = $('#items');
    const emptyState = $('#emptyState');
    const itemInput = $('#itemInput');
    const addItemBtn = $('#addItemBtn');
    const counterPill = $('#counterPill');
    const clearDoneBtn = $('#clearDoneBtn');
    const filterButtons = $$('.filters [data-filter]');
    const exportBtn = $('#exportBtn');
    const importBtn = $('#importBtn');

    let currentFilter = 'all';

    // --- Renderização Sidebar ---
    function renderSidebar(){
      const q = searchInput.value.trim().toLowerCase();
      const frag = document.createDocumentFragment();
      const lists = state.lists
        .map(list => ({
          ...list,
          total: list.items.length,
          remaining: list.items.filter(i => !i.done).length
        }))
        .filter(list => list.name.toLowerCase().includes(q));

      listsEl.innerHTML = '';
      lists.forEach(list => {
        const el = document.createElement('div');
        el.className = 'list-item' + (list.id === state.selectedListId ? ' active' : '');
        el.setAttribute('role','option');
        el.setAttribute('aria-selected', list.id === state.selectedListId ? 'true' : 'false');
        el.dataset.id = list.id;
        el.innerHTML = `
          <div>
            <div><strong>${escapeHtml(list.name)}</strong></div>
            <div class="meta">${list.remaining}/${list.total} a fazer</div>
          </div>
          <div class="pill" aria-hidden="true">${list.total}</div>
        `;
        frag.appendChild(el);
      });
      listsEl.appendChild(frag);
      totalListsEl.textContent = `${state.lists.length} ${state.lists.length === 1 ? 'lista':'listas'}`;

      // estado vazio?
      const hasSelection = !!state.selectedListId && state.lists.some(l => l.id === state.selectedListId);
      emptyState.hidden = hasSelection;
    }

    // --- Renderização Principal ---
    function getSelected(){
      return state.lists.find(l => l.id === state.selectedListId) || null;
    }

    function renderMain(){
      const list = getSelected();
      if(!list){
        itemsEl.innerHTML = '';
        listTitle.value = '';
        counterPill.textContent = '0 itens';
        return;
      }
      listTitle.value = list.name;

      // Filtra itens
      let items = list.items;
      if(currentFilter === 'active') items = items.filter(i => !i.done);
      if(currentFilter === 'done') items = items.filter(i => i.done);

      itemsEl.innerHTML = '';
      if(items.length === 0){
        const info = document.createElement('div');
        info.className = 'empty';
        info.innerHTML = '<p>Nenhum item por aqui.</p>';
        itemsEl.appendChild(info);
      }else{
        const frag = document.createDocumentFragment();
        items.forEach(item => {
          const el = document.createElement('div');
          el.className = 'item' + (item.done ? ' done' : '');
          el.dataset.id = item.id;
          el.setAttribute('role','listitem');
          el.innerHTML = `
            <input type="checkbox" ${item.done?'checked':''} aria-label="Marcar como concluído">
            <input class="text" value="${escapeAttr(item.text)}" aria-label="Editar texto do item">
            <button class="btn btn-ghost del" title="Remover item">🗑️</button>
          `;
          frag.appendChild(el);
        });
        itemsEl.appendChild(frag);
      }

      const total = list.items.length;
      const done = list.items.filter(i => i.done).length;
      counterPill.textContent = `${done}/${total} concluídos`;
    }

    // --- Ações ---

    // criar nova lista
    newListBtn.addEventListener('click', () => {
      const name = prompt('Nome da nova lista:', 'Nova lista');
      if(!name) return;
      const id = uid();
      state.lists.unshift({ id, name: name.trim(), items: [] });
      state.selectedListId = id;
      saveState();
    });

    // selecionar lista
    listsEl.addEventListener('click', (e) => {
      const item = e.target.closest('.list-item');
      if(!item) return;
      state.selectedListId = item.dataset.id;
      saveState();
    });

    // renomear lista (botão)
    renameBtn.addEventListener('click', () => {
      const list = getSelected();
      if(!list) return;
      const name = prompt('Novo nome da lista:', list.name);
      if(!name) return;
      list.name = name.trim();
      saveState();
    });

    // renomear via campo título
    listTitle.addEventListener('change', () => {
      const list = getSelected();
      if(!list) return;
      list.name = listTitle.value.trim() || 'Sem título';
      saveState();
    });

    // excluir lista
    deleteListBtn.addEventListener('click', () => {
      const list = getSelected();
      if(!list) return;
      const ok = confirm(`Excluir a lista "${list.name}"? Isso removerá todos os itens.`);
      if(!ok) return;
      state.lists = state.lists.filter(l => l.id !== list.id);
      state.selectedListId = state.lists[0]?.id || null;
      saveState();
    });

    // adicionar item
    function addItem(){
      const list = getSelected();
      if(!list) return;
      const text = itemInput.value.trim();
      if(!text) return;
      list.items.unshift({ id: uid(), text, done:false });
      itemInput.value = '';
      saveState();
    }
    addItemBtn.addEventListener('click', addItem);
    itemInput.addEventListener('keydown', (e) => {
      if(e.key === 'Enter') addItem();
    });

    // delegação para itens (toggle, editar, remover)
    itemsEl.addEventListener('click', (e) => {
      const row = e.target.closest('.item');
      if(!row) return;
      const list = getSelected();
      if(!list) return;
      const item = list.items.find(i => i.id === row.dataset.id);
      if(!item) return;

      if(e.target.matches('input[type="checkbox"]')){
        item.done = e.target.checked;
        saveState();
      }
      if(e.target.matches('button.del')){
        const ok = confirm('Remover este item?');
        if(!ok) return;
        list.items = list.items.filter(i => i.id !== item.id);
        saveState();
      }
    });

    itemsEl.addEventListener('change', (e) => {
      if(e.target.matches('.item .text')){
        const row = e.target.closest('.item');
        const list = getSelected();
        if(!row || !list) return;
        const item = list.items.find(i => i.id === row.dataset.id);
        if(!item) return;
        item.text = e.target.value.trim();
        saveState();
      }
    });

    // filtros
    filterButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        filterButtons.forEach(b => b.setAttribute('aria-pressed', 'false'));
        btn.setAttribute('aria-pressed', 'true');
        currentFilter = btn.dataset.filter;
        renderMain();
      });
    });

    // limpar concluídos
    clearDoneBtn.addEventListener('click', () => {
      const list = getSelected();
      if(!list) return;
      if(list.items.every(i => !i.done)) return alert('Não há itens concluídos.');
      const ok = confirm('Remover todos os itens concluídos desta lista?');
      if(!ok) return;
      list.items = list.items.filter(i => !i.done);
      saveState();
    });

    // exportar / importar
    exportBtn.addEventListener('click', () => {
      const data = JSON.stringify(state, null, 2);
      const blob = new Blob([data], {type:'application/json'});
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'listas-backup.json';
      a.click();
      URL.revokeObjectURL(url);
    });

    importBtn.addEventListener('click', async () => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'application/json';
      input.onchange = async () => {
        const file = input.files[0];
        if(!file) return;
        try{
          const text = await file.text();
          const data = JSON.parse(text);
          if(!data || !Array.isArray(data.lists)) throw new Error('Formato inválido');
          state = data;
          saveState();
          alert('Importado com sucesso!');
        }catch(err){
          alert('Falha ao importar: ' + err.message);
        }
      };
      input.click();
    });

    // pesquisa listas
    searchInput.addEventListener('input', renderSidebar);

    // Helpers para segurança de texto em HTML
    function escapeHtml(str=''){
      return str.replace(/[&<>"']/g, s => ({
        '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
      }[s]));
    }
    function escapeAttr(str=''){
      return str.replace(/"/g, '&quot;');
    }

    // Primeira pintura
    renderSidebar();
    renderMain();

    // Acessibilidade básica via teclas (navegar listas)
    listsEl.addEventListener('keydown', (e) => {
      const items = $$('.list-item', listsEl);
      const idx = items.findIndex(it => it.dataset.id === state.selectedListId);
      if(e.key === 'ArrowDown'){
        const next = items[Math.min(items.length-1, idx+1)];
        if(next){ state.selectedListId = next.dataset.id; saveState(); }
      }
      if(e.key === 'ArrowUp'){
        const prev = items[Math.max(0, idx-1)];
        if(prev){ state.selectedListId = prev.dataset.id; saveState(); }
      }
    });