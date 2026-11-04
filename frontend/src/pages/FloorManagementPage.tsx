import React, { useState, useEffect } from 'react';
import { floorsApi, tablesApi } from '../api/endpoints';
import { Layers, Plus, Trash2, Edit2, Users, CheckCircle, AlertCircle } from 'lucide-react';
import { Modal } from '../components/Modal';

export const FloorManagementPage: React.FC = () => {
  const [floors, setFloors] = useState<any[]>([]);
  const [selectedFloor, setSelectedFloor] = useState<any | null>(null);
  const [tables, setTables] = useState<any[]>([]);

  // Modals
  const [showFloorModal, setShowFloorModal] = useState(false);
  const [showEditFloorModal, setShowEditFloorModal] = useState(false);
  const [floorName, setFloorName] = useState('');
  const [floorDesc, setFloorDesc] = useState('');

  const [editFloorId, setEditFloorId] = useState('');
  const [editFloorName, setEditFloorName] = useState('');
  const [editFloorDesc, setEditFloorDesc] = useState('');

  const [showTableModal, setShowTableModal] = useState(false);
  const [showEditTableModal, setShowEditTableModal] = useState(false);
  const [tableNumber, setTableNumber] = useState('');
  const [seatingCapacity, setSeatingCapacity] = useState(4);

  const [editTableId, setEditTableId] = useState('');
  const [editTableNumber, setEditTableNumber] = useState('');
  const [editTableCapacity, setEditTableCapacity] = useState(4);

  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const loadData = async () => {
    try {
      const fList = await floorsApi.getFloors();
      setFloors(fList);
      if (fList.length > 0) {
        // If current selected floor still exists, keep it, else select first
        const exists = fList.find((f: any) => f.id === selectedFloor?.id);
        if (exists) {
          selectFloor(exists);
        } else {
          selectFloor(fList[0]);
        }
      } else {
        setSelectedFloor(null);
        setTables([]);
      }
    } catch (e: any) {
      setErrorMsg(e.message || 'Failed to load floors');
    }
  };

  const selectFloor = async (floor: any) => {
    setSelectedFloor(floor);
    try {
      const tList = await tablesApi.getTables(floor.id);
      setTables(tList);
    } catch (e: any) {
      setErrorMsg(e.message || 'Failed to load tables');
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Floor Actions
  const handleCreateFloor = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const created = await floorsApi.createFloor({
        name: floorName,
        description: floorDesc,
        floorNumber: floors.length,
      });
      setShowFloorModal(false);
      setFloorName('');
      setFloorDesc('');
      setSuccessMsg(`Floor "${created.name}" created!`);
      setTimeout(() => setSuccessMsg(null), 3000);
      loadData();
    } catch (e: any) {
      setErrorMsg(e.response?.data?.message || e.message || 'Failed to create floor');
    }
  };

  const openEditFloor = (floor: any) => {
    setEditFloorId(floor.id);
    setEditFloorName(floor.name);
    setEditFloorDesc(floor.description || '');
    setShowEditFloorModal(true);
  };

  const handleUpdateFloor = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await floorsApi.updateFloor(editFloorId, {
        name: editFloorName,
        description: editFloorDesc,
      });
      setShowEditFloorModal(false);
      setSuccessMsg(`Floor "${editFloorName}" updated successfully!`);
      setTimeout(() => setSuccessMsg(null), 3000);
      loadData();
    } catch (e: any) {
      setErrorMsg(e.response?.data?.message || e.message || 'Failed to update floor');
    }
  };

  const handleDeleteFloor = async (floor: any) => {
    if (!confirm(`Are you sure you want to delete floor "${floor.name}" and all associated dining tables?`)) {
      return;
    }
    try {
      await floorsApi.deleteFloor(floor.id);
      setSuccessMsg(`Floor "${floor.name}" deleted!`);
      setTimeout(() => setSuccessMsg(null), 3000);
      loadData();
    } catch (e: any) {
      setErrorMsg(e.response?.data?.message || e.message || 'Failed to delete floor');
    }
  };

  // Table Actions
  const handleCreateTable = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFloor) return;
    try {
      await tablesApi.createTable({
        tableNumber,
        floorId: selectedFloor.id,
        seatingCapacity,
      });
      setShowTableModal(false);
      setTableNumber('');
      setSuccessMsg(`Table "${tableNumber}" added to ${selectedFloor.name}!`);
      setTimeout(() => setSuccessMsg(null), 3000);
      selectFloor(selectedFloor);
    } catch (e: any) {
      setErrorMsg(e.response?.data?.message || e.message || 'Failed to create table');
    }
  };

  const openEditTable = (table: any) => {
    setEditTableId(table.id);
    setEditTableNumber(table.tableNumber);
    setEditTableCapacity(table.seatingCapacity);
    setShowEditTableModal(true);
  };

  const handleUpdateTable = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await tablesApi.updateTable(editTableId, {
        tableNumber: editTableNumber,
        seatingCapacity: editTableCapacity,
      });
      setShowEditTableModal(false);
      setSuccessMsg(`Table "${editTableNumber}" updated!`);
      setTimeout(() => setSuccessMsg(null), 3000);
      if (selectedFloor) selectFloor(selectedFloor);
    } catch (e: any) {
      setErrorMsg(e.response?.data?.message || e.message || 'Failed to update table');
    }
  };

  const handleDeleteTable = async (table: any) => {
    if (!confirm(`Are you sure you want to delete table "${table.tableNumber}"?`)) return;
    try {
      await tablesApi.deleteTable(table.id);
      setSuccessMsg(`Table "${table.tableNumber}" removed!`);
      setTimeout(() => setSuccessMsg(null), 3000);
      if (selectedFloor) selectFloor(selectedFloor);
    } catch (e: any) {
      setErrorMsg(e.response?.data?.message || e.message || 'Failed to delete table');
    }
  };

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-white flex items-center gap-3">
            <span className="p-2 rounded-xl bg-amber-500/10 text-amber-500 border border-amber-500/20">
              <Layers className="w-6 h-6" />
            </span>
            <span>Floors & Dining Tables Layout</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Configure multi-floor seating architectures, edit and delete floors, and manage individual dining tables
          </p>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => setShowFloorModal(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold transition"
          >
            <Plus className="w-4 h-4" />
            <span>Add Floor</span>
          </button>
          <button
            onClick={() => setShowTableModal(true)}
            disabled={!selectedFloor}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-lg shadow-amber-500/20 transition disabled:opacity-50"
          >
            <Plus className="w-4 h-4" />
            <span>Add Table</span>
          </button>
        </div>
      </div>

      {successMsg && (
        <div className="p-3.5 rounded-xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 text-xs font-semibold flex items-center gap-2">
          <CheckCircle className="w-4 h-4 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}
      {errorMsg && (
        <div className="p-3.5 rounded-xl bg-rose-500/20 border border-rose-500/30 text-rose-400 text-xs font-semibold flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
          <button onClick={() => setErrorMsg(null)} className="text-xs font-bold hover:underline">
            Dismiss
          </button>
        </div>
      )}

      {/* Floors Navigation Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {floors.map((f) => (
          <button
            key={f.id}
            onClick={() => selectFloor(f)}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 whitespace-nowrap ${
              selectedFloor?.id === f.id
                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>{f.name}</span>
          </button>
        ))}
      </div>

      {/* Floor Details & Table Layout Grid */}
      {selectedFloor ? (
        <div className="glass-panel p-6 rounded-3xl border border-slate-800 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
            <div>
              <div className="flex items-center gap-3">
                <h3 className="font-bold text-base text-white">{selectedFloor.name} Tables</h3>
                <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                  {tables.length} Total Tables
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">{selectedFloor.description || 'Floor dining area'}</p>
            </div>

            {/* Floor Management Action Buttons */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => openEditFloor(selectedFloor)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 border border-slate-700 transition"
              >
                <Edit2 className="w-3.5 h-3.5 text-amber-400" />
                <span>Edit Floor</span>
              </button>
              <button
                onClick={() => handleDeleteFloor(selectedFloor)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-xs font-semibold text-rose-400 border border-rose-500/20 transition"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete Floor</span>
              </button>
            </div>
          </div>

          {/* Tables Grid */}
          {tables.length === 0 ? (
            <div className="text-center py-12 text-slate-400 text-xs">
              No tables on this floor yet. Click "Add Table" to create one.
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 pt-2">
              {tables.map((t) => (
                <div
                  key={t.id}
                  className="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col justify-between hover:border-slate-700 transition relative group"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-black text-base sm:text-lg text-white">{t.tableNumber}</span>
                    <div className="flex items-center gap-1 sm:opacity-0 sm:group-hover:opacity-100 transition">
                      <button
                        onClick={() => openEditTable(t)}
                        className="p-1 text-slate-400 hover:text-amber-400 transition"
                        title="Edit Table"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteTable(t)}
                        className="p-1 text-slate-400 hover:text-rose-400 transition"
                        title="Delete Table"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <div className="mt-3 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1 text-slate-400">
                      <Users className="w-3.5 h-3.5" />
                      <span>{t.seatingCapacity} Seats</span>
                    </div>
                    <span
                      className={`text-[9px] uppercase font-bold px-1.5 py-0.5 rounded ${
                        t.status === 'AVAILABLE'
                          ? 'bg-emerald-500/10 text-emerald-400'
                          : t.status === 'BILLING'
                          ? 'bg-blue-500/10 text-blue-400'
                          : 'bg-amber-500/10 text-amber-400'
                      }`}
                    >
                      {t.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="glass-panel p-12 text-center text-slate-400 rounded-3xl border border-slate-800">
          No floors found. Click "Add Floor" to create your first dining floor layout.
        </div>
      )}

      {/* 1. Add Floor Modal */}
      <Modal isOpen={showFloorModal} onClose={() => setShowFloorModal(false)} title="Add Dining Floor">
        <form onSubmit={handleCreateFloor} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">
              Floor Name
            </label>
            <input
              type="text"
              required
              placeholder="e.g. VIP Rooftop Lounge"
              value={floorName}
              onChange={(e) => setFloorName(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs focus:outline-none focus:border-amber-500"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">
              Description (Optional)
            </label>
            <input
              type="text"
              placeholder="e.g. Candlelight view tables"
              value={floorDesc}
              onChange={(e) => setFloorDesc(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs focus:outline-none focus:border-amber-500"
            />
          </div>
          <button
            type="submit"
            className="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-lg transition"
          >
            Create Floor
          </button>
        </form>
      </Modal>

      {/* 2. Edit Floor Modal */}
      <Modal isOpen={showEditFloorModal} onClose={() => setShowEditFloorModal(false)} title="Edit Dining Floor">
        <form onSubmit={handleUpdateFloor} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">
              Floor Name
            </label>
            <input
              type="text"
              required
              value={editFloorName}
              onChange={(e) => setEditFloorName(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs focus:outline-none focus:border-amber-500"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">
              Description (Optional)
            </label>
            <input
              type="text"
              value={editFloorDesc}
              onChange={(e) => setEditFloorDesc(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs focus:outline-none focus:border-amber-500"
            />
          </div>
          <div className="flex gap-2">
            <button
              type="submit"
              className="flex-1 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-lg transition"
            >
              Save Changes
            </button>
            <button
              type="button"
              onClick={() => {
                const fl = floors.find((f) => f.id === editFloorId);
                if (fl) {
                  setShowEditFloorModal(false);
                  handleDeleteFloor(fl);
                }
              }}
              className="px-4 py-2.5 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-400 font-bold text-xs border border-rose-500/30 transition"
            >
              Delete Floor
            </button>
          </div>
        </form>
      </Modal>

      {/* 3. Add Table Modal */}
      <Modal isOpen={showTableModal} onClose={() => setShowTableModal(false)} title="Add Dining Table">
        <form onSubmit={handleCreateTable} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">
              Table Number / Name
            </label>
            <input
              type="text"
              required
              placeholder="e.g. T-14, VIP-2, BAR-1"
              value={tableNumber}
              onChange={(e) => setTableNumber(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs focus:outline-none focus:border-amber-500"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">
              Seating Capacity
            </label>
            <input
              type="number"
              min={1}
              max={50}
              required
              value={seatingCapacity}
              onChange={(e) => setSeatingCapacity(Number(e.target.value))}
              className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs focus:outline-none focus:border-amber-500"
            />
          </div>
          <button
            type="submit"
            className="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-lg transition"
          >
            Add Table
          </button>
        </form>
      </Modal>

      {/* 4. Edit Table Modal */}
      <Modal isOpen={showEditTableModal} onClose={() => setShowEditTableModal(false)} title="Edit Dining Table">
        <form onSubmit={handleUpdateTable} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">
              Table Number / Identifier
            </label>
            <input
              type="text"
              required
              value={editTableNumber}
              onChange={(e) => setEditTableNumber(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs focus:outline-none focus:border-amber-500"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">
              Seating Capacity
            </label>
            <input
              type="number"
              min={1}
              max={50}
              required
              value={editTableCapacity}
              onChange={(e) => setEditTableCapacity(Number(e.target.value))}
              className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs focus:outline-none focus:border-amber-500"
            />
          </div>
          <div className="flex gap-2">
            <button
              type="submit"
              className="flex-1 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-lg transition"
            >
              Update Table
            </button>
            <button
              type="button"
              onClick={() => {
                const tbl = tables.find((t) => t.id === editTableId);
                if (tbl) {
                  setShowEditTableModal(false);
                  handleDeleteTable(tbl);
                }
              }}
              className="px-4 py-2.5 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-400 font-bold text-xs border border-rose-500/30 transition"
            >
              Delete
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
