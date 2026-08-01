let brands = [];
let materials = [];

function switchTab(name) {
  document.querySelectorAll('.tab').forEach(t => t.classList.toggle('active', t.dataset.tab === name));
  document.querySelectorAll('.tab-panel').forEach(p => p.style.display = 'none');
  document.getElementById(`panel-${name}`).style.display = 'block';
}

async function loadBrands() {
  brands = await API.get('brands');
  const tbody = document.querySelector('#brandsTable tbody');
  tbody.innerHTML = brands.map(b => `
    <tr data-brand-id="${b.id}">
      <td><input value="${b.name}" data-field="name" class="inline-input"></td>
      <td><input type="number" value="${b.price}" data-field="price" step="0.01" class="inline-input"></td>
      <td>${fmt(b.unit_cost)}</td>
      <td>
        <button class="btn btn-secondary btn-sm" data-save-brand="${b.id}">Save</button>
        <button class="btn btn-danger btn-sm" data-del-brand="${b.id}">Delete</button>
      </td>
    </tr>
  `).join('') || '<tr><td colspan="4" class="empty">No brands yet</td></tr>';

  const sel = document.getElementById('recipeBrand');
  sel.innerHTML = brands.map(b => `<option value="${b.id}">${b.name}</option>`).join('');
}

async function loadMaterials() {
  materials = await API.get('materials');
  const tbody = document.querySelector('#materialsTable tbody');
  tbody.innerHTML = materials.map(m => `
    <tr data-mat-id="${m.id}">
      <td><input value="${m.name}" data-field="name" class="inline-input"></td>
      <td><input value="${m.unit}" data-field="unit" class="inline-input"></td>
      <td><input type="number" value="${m.cost_per_unit}" data-field="cost_per_unit" step="0.01" class="inline-input"></td>
      <td>
        <button class="btn btn-secondary btn-sm" data-save-mat="${m.id}">Save</button>
        <button class="btn btn-danger btn-sm" data-del-mat="${m.id}">Delete</button>
      </td>
    </tr>
  `).join('') || '<tr><td colspan="4" class="empty">No materials yet</td></tr>';

  const sel = document.getElementById('recipeMaterial');
  sel.innerHTML = materials.map(m => `<option value="${m.id}">${m.name} (${m.unit})</option>`).join('');
}

async function loadRecipes() {
  const recipes = await API.get('recipes');
  const tbody = document.querySelector('#recipesTable tbody');
  tbody.innerHTML = recipes.map(r => `
    <tr>
      <td>${r.brand_name}</td>
      <td>${r.material_name}</td>
      <td><input type="number" value="${r.quantity}" step="0.001" data-recipe-id="${r.id}" class="inline-input recipe-qty"></td>
      <td>${r.unit}</td>
      <td>
        <button class="btn btn-secondary btn-sm" data-save-recipe="${r.id}">Save</button>
        <button class="btn btn-danger btn-sm" data-del-recipe="${r.id}">Delete</button>
      </td>
    </tr>
  `).join('') || '<tr><td colspan="5" class="empty">No recipes yet</td></tr>';
}

async function loadEnergy() {
  const cfg = await API.get('energy-config');
  document.getElementById('dieselRate').value = cfg.diesel_cost_per_liter;
}

document.addEventListener('DOMContentLoaded', async () => {
  setActiveNav('database');
  await loadBrands();
  await loadMaterials();
  await loadRecipes();
  await loadEnergy();

  document.querySelectorAll('.tab').forEach(t => {
    t.addEventListener('click', () => switchTab(t.dataset.tab));
  });

  document.getElementById('addBrand').addEventListener('click', async () => {
    const name = document.getElementById('newBrandName').value.trim();
    const price = Number(document.getElementById('newBrandPrice').value) || 0;
    if (!name) return toast('Enter a brand name');
    await API.post('brands', { name, price });
    document.getElementById('newBrandName').value = '';
    document.getElementById('newBrandPrice').value = '';
    toast('Brand added');
    loadBrands();
  });

  document.getElementById('addMaterial').addEventListener('click', async () => {
    const name = document.getElementById('newMatName').value.trim();
    const unit = document.getElementById('newMatUnit').value.trim() || 'kg';
    const cost_per_unit = Number(document.getElementById('newMatCost').value) || 0;
    if (!name) return toast('Enter a material name');
    await API.post('materials', { name, unit, cost_per_unit });
    document.getElementById('newMatName').value = '';
    document.getElementById('newMatUnit').value = '';
    document.getElementById('newMatCost').value = '';
    toast('Material added');
    loadMaterials();
  });

  document.getElementById('addRecipe').addEventListener('click', async () => {
    const brand_id = Number(document.getElementById('recipeBrand').value);
    const material_id = Number(document.getElementById('recipeMaterial').value);
    const quantity = Number(document.getElementById('recipeQty').value) || 0;
    if (!quantity) return toast('Enter a quantity');
    try {
      await API.post('recipes', { brand_id, material_id, quantity });
      toast('Recipe entry added');
      loadRecipes();
      loadBrands();
    } catch (e) {
      toast(e.message);
    }
  });

  document.getElementById('saveEnergy').addEventListener('click', async () => {
    await API.put('energy-config', {
      diesel_cost_per_liter: Number(document.getElementById('dieselRate').value) || 0
    });
    toast('Energy config saved');
  });

  document.getElementById('panel-brands').addEventListener('click', async e => {
    const saveId = e.target.dataset.saveBrand;
    const delId = e.target.dataset.delBrand;
    if (saveId) {
      const row = document.querySelector(`tr[data-brand-id="${saveId}"]`);
      await API.put(`brands/${saveId}`, {
        name: row.querySelector('[data-field="name"]').value,
        price: Number(row.querySelector('[data-field="price"]').value)
      });
      toast('Brand updated');
      loadBrands();
    }
    if (delId) {
      if (!confirm('Delete this brand and all related data?')) return;
      await API.del(`brands/${delId}`);
      toast('Brand deleted');
      loadBrands();
      loadRecipes();
    }
  });

  document.getElementById('panel-materials').addEventListener('click', async e => {
    const saveId = e.target.dataset.saveMat;
    const delId = e.target.dataset.delMat;
    if (saveId) {
      const row = document.querySelector(`tr[data-mat-id="${saveId}"]`);
      await API.put(`materials/${saveId}`, {
        name: row.querySelector('[data-field="name"]').value,
        unit: row.querySelector('[data-field="unit"]').value,
        cost_per_unit: Number(row.querySelector('[data-field="cost_per_unit"]').value)
      });
      toast('Material updated');
      loadMaterials();
    }
    if (delId) {
      if (!confirm('Delete this material?')) return;
      await API.del(`materials/${delId}`);
      toast('Material deleted');
      loadMaterials();
      loadRecipes();
    }
  });

  document.getElementById('panel-recipes').addEventListener('click', async e => {
    const saveId = e.target.dataset.saveRecipe;
    const delId = e.target.dataset.delRecipe;
    if (saveId) {
      const qty = document.querySelector(`[data-recipe-id="${saveId}"]`).value;
      await API.put(`recipes/${saveId}`, { quantity: Number(qty) });
      toast('Recipe updated');
      loadBrands();
    }
    if (delId) {
      await API.del(`recipes/${delId}`);
      toast('Recipe entry deleted');
      loadRecipes();
      loadBrands();
    }
  });
});
