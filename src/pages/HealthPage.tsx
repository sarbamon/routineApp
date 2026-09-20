import { useState, useEffect, useRef } from "react";
import { API_URL } from "../config/api";
import { useFriends } from "../context/FriendsContext";
import { useSocket } from "../context/SocketContext";
import { Activity, Share2, Camera, Sparkles, ZoomIn, Users, Heart, Trash2, AlertCircle, Settings, Utensils, Dumbbell, Microscope, Pill, ClipboardList } from "lucide-react";

interface Comment {
  _id?: string;
  user?: string;
  username: string;
  text: string;
  createdAt?: string;
}

interface HealthRecord {
  _id: string;
  title: string;
  category: "Meals" | "Workout Progress" | "Lab Reports" | "Prescriptions" | "General";
  imageUrl: string;
  cloudinaryPublicId?: string;
  notes?: string;
  date: string;
  ownerId: string;
  ownerUsername: string;
  isShared: boolean;
  sharedWithUsernames: string[];
  likeCount: number;
  likedByMe: boolean;
  comments: Comment[];
  createdAt: string;
}

const CATEGORIES = ["All", "Meals", "Workout Progress", "Lab Reports", "Prescriptions", "General"];

export default function HealthPage() {
  const getAuthHeaders = () => {
    const token = localStorage.getItem("token");
    return { Authorization: `Bearer ${token}` };
  };

  const { friends } = useFriends();
  const { socket }  = useSocket();

  const [records,          setRecords]          = useState<HealthRecord[]>([]);
  const [loading,          setLoading]          = useState(true);
  const [activeCategory,   setActiveCategory]   = useState("All");

  // Modals
  const [showAddModal,     setShowAddModal]     = useState(false);
  const [showShareModal,   setShowShareModal]   = useState(false);
  const [selectedRecordId, setSelectedRecordId] = useState<string | null>(null);
  const [previewImage,     setPreviewImage]     = useState<string | null>(null);

  // Form State
  const [title,               setTitle]               = useState("");
  const [category,            setCategory]            = useState<HealthRecord["category"]>("General");
  const [imageUrl,            setImageUrl]            = useState("");
  const [notes,               setNotes]               = useState("");
  const [date,                setDate]                = useState(new Date().toISOString().split("T")[0]);
  const [selectedFriendToShare, setSelectedFriendToShare] = useState("");
  const [submitting,          setSubmitting]          = useState(false);
  const [formErr,             setFormErr]             = useState("");

  // Cloudinary Settings
  const [cloudName,    setCloudName]    = useState(() => localStorage.getItem("cloudinary_cloud_name") || "");
  const [uploadPreset, setUploadPreset] = useState(() => localStorage.getItem("cloudinary_preset") || "");
  const [uploadingImg, setUploadingImg] = useState(false);

  // Comment input state by record ID
  const [commentInputs, setCommentInputs] = useState<Record<string, string>>({});

  // Share Modal State
  const [shareFriend, setSelectedShareFriend] = useState("");
  const [shareMsg,    setShareMsg]            = useState("");
  const [shareErr,    setShareErr]            = useState("");
  const [shareLoading, setShareLoading]       = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchRecords = async () => {
    const token = localStorage.getItem("token");
    if (!token) return;
    try {
      const res = await fetch(`${API_URL}/api/health`, { headers: getAuthHeaders() });
      const data = await res.json();
      setRecords(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Fetch health records error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecords();

    if (socket) {
      socket.on("health_updated", () => {
        fetchRecords();
      });
    }

    return () => {
      if (socket) {
        socket.off("health_updated");
      }
    };
  }, [socket]);

  // Handle Cloudinary Image Upload
  const handleImageFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingImg(true);
    setFormErr("");

    try {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onloadend = async () => {
        const base64data = reader.result as string;
        try {
          const res = await fetch(`${API_URL}/api/health/upload-image`, {
            method: "POST",
            headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
            body: JSON.stringify({ image: base64data }),
          });
          const data = await res.json();
          if (res.ok && data.url) {
            setImageUrl(data.url);
          } else {
            setImageUrl(base64data);
          }
        } catch {
          setImageUrl(base64data);
        } finally {
          setUploadingImg(false);
        }
      };
    } catch (err: any) {
      console.error("Image upload error:", err);
      setUploadingImg(false);
    }
  };

  // Add Health Record Submit
  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setFormErr("Please provide a title");
      return;
    }
    if (!imageUrl) {
      setFormErr("Please select or upload a photo");
      return;
    }

    setSubmitting(true);
    setFormErr("");

    try {
      const sharedWithArr = selectedFriendToShare ? [selectedFriendToShare] : [];
      const res = await fetch(`${API_URL}/api/health`, {
        method: "POST",
        headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          category,
          imageUrl,
          notes: notes.trim(),
          date,
          sharedWith: sharedWithArr,
        }),
      });

      if (res.ok) {
        // Save Cloudinary settings to localStorage for future uploads
        if (cloudName) localStorage.setItem("cloudinary_cloud_name", cloudName);
        if (uploadPreset) localStorage.setItem("cloudinary_preset", uploadPreset);

        setTitle("");
        setImageUrl("");
        setNotes("");
        setSelectedFriendToShare("");
        setShowAddModal(false);
        fetchRecords();
      } else {
        const d = await res.json();
        setFormErr(d.message || "Failed to add health photo");
      }
    } catch {
      setFormErr("Failed to connect to server");
    } finally {
      setSubmitting(false);
    }
  };

  // Toggle Like
  const handleToggleLike = async (recordId: string) => {
    // Optimistic update
    setRecords(prev => prev.map(r => {
      if (r._id === recordId) {
        return {
          ...r,
          likedByMe: !r.likedByMe,
          likeCount: r.likedByMe ? r.likeCount - 1 : r.likeCount + 1,
        };
      }
      return r;
    }));

    try {
      await fetch(`${API_URL}/api/health/${recordId}/like`, {
        method: "POST",
        headers: getAuthHeaders(),
      });
    } catch (err) {
      console.error(err);
      fetchRecords();
    }
  };

  // Submit Comment
  const handleAddComment = async (recordId: string) => {
    const text = commentInputs[recordId];
    if (!text || !text.trim()) return;

    setCommentInputs(prev => ({ ...prev, [recordId]: "" }));

    try {
      await fetch(`${API_URL}/api/health/${recordId}/comment`, {
        method: "POST",
        headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({ text: text.trim() }),
      });
      fetchRecords();
    } catch (err) {
      console.error(err);
    }
  };

  // Delete Record
  const handleDeleteRecord = async (recordId: string) => {
    if (!window.confirm("Are you sure you want to delete this health photo record?")) return;

    setRecords(prev => prev.filter(r => r._id !== recordId));
    try {
      await fetch(`${API_URL}/api/health/${recordId}`, {
        method: "DELETE",
        headers: getAuthHeaders(),
      });
    } catch (err) {
      console.error(err);
      fetchRecords();
    }
  };

  // Share Vault/Record
  const handleShareVault = async () => {
    if (!shareFriend) {
      setShareErr("Please select a friend to share with");
      return;
    }

    setShareLoading(true);
    setShareMsg("");
    setShareErr("");

    try {
      const res = await fetch(`${API_URL}/api/health/share`, {
        method: "POST",
        headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({
          recipientUserId: shareFriend,
          recordId: selectedRecordId || undefined,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setShareMsg("Successfully shared health photos with live access! 🎉");
        fetchRecords();
        setTimeout(() => {
          setShowShareModal(false);
          setShareMsg("");
          setSelectedShareFriend("");
          setSelectedRecordId(null);
        }, 1800);
      } else {
        setShareErr(data.message || "Failed to share health photos");
      }
    } catch {
      setShareErr("Failed to share health photos");
    } finally {
      setShareLoading(false);
    }
  };

  const filteredRecords = records.filter(r => 
    activeCategory === "All" || r.category === activeCategory
  );

  return (
    <div className="p-4 md:p-6 min-h-screen bg-[#04040a] text-slate-200">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-black text-white flex items-center gap-2">
            <Activity className="w-6 h-6 text-emerald-400" /> Health & Photo Vault
          </h1>
          <p className="text-[10px] text-slate-500 uppercase tracking-widest mt-0.5">
            Cloudinary Photo Sharing • Meals, Workouts & Health Progress
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => { setSelectedRecordId(null); setShowShareModal(true); }}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-violet-500/10 border border-violet-500/20 text-violet-400 text-xs font-bold rounded-xl hover:bg-violet-500/20 transition-all cursor-pointer"
          >
            <Share2 className="w-3.5 h-3.5" /> Share Health Vault
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-1.5 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-black rounded-xl transition-all cursor-pointer shadow-[0_0_16px_rgba(16,185,129,0.3)]"
          >
            <Camera className="w-3.5 h-3.5" /> Add Health Photo
          </button>
        </div>
      </div>

      {/* ── Category Filter Tabs ── */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-1 [&::-webkit-scrollbar]:hidden">
        {CATEGORIES.map(cat => {
          const isActive = activeCategory === cat;
          return (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer whitespace-nowrap border flex items-center gap-1.5 ${
                isActive
                  ? "bg-white text-black border-white shadow-[0_0_15px_rgba(255,255,255,0.2)]"
                  : "bg-[#0d0d1a] border-white/5 text-slate-400 hover:text-white hover:bg-white/5"
              }`}
            >
              {cat === "All" ? <Sparkles className="w-3.5 h-3.5 text-emerald-400" /> : null}
              {cat === "Meals" ? <Utensils className="w-3.5 h-3.5 text-amber-400" /> : null}
              {cat === "Workout Progress" ? <Dumbbell className="w-3.5 h-3.5 text-cyan-400" /> : null}
              {cat === "Lab Reports" ? <Microscope className="w-3.5 h-3.5 text-violet-400" /> : null}
              {cat === "Prescriptions" ? <Pill className="w-3.5 h-3.5 text-pink-400" /> : null}
              {cat === "General" ? <ClipboardList className="w-3.5 h-3.5 text-emerald-400" /> : null}
              <span>{cat === "All" ? "All Photos" : cat}</span>
            </button>
          );
        })}
      </div>

      {/* ── Main Content Grid ── */}
      {loading ? (
        <div className="text-center py-16">
          <div className="w-8 h-8 border-2 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin mx-auto mb-2" />
          <p className="text-xs text-slate-500 uppercase tracking-widest font-bold">Loading health gallery...</p>
        </div>
      ) : filteredRecords.length === 0 ? (
        <div className="bg-[#0d0d1a] border border-white/5 rounded-3xl p-12 text-center flex flex-col items-center justify-center gap-3">
          <Camera className="w-12 h-12 text-slate-600 opacity-40 mb-1" />
          <p className="text-sm font-bold text-white">No health photos uploaded yet</p>
          <p className="text-xs text-slate-500 max-w-sm">
            Upload workout progress, meal preps, or lab reports using Cloudinary to share with friends.
          </p>
          <button
            onClick={() => setShowAddModal(true)}
            className="mt-2 px-5 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-black uppercase tracking-wider rounded-xl transition-all cursor-pointer flex items-center gap-1.5"
          >
            <Camera className="w-3.5 h-3.5" /> Upload First Photo
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredRecords.map(record => (
            <div
              key={record._id}
              className="bg-[#0d0d1a] border border-white/[0.08] rounded-3xl overflow-hidden shadow-[0_8px_32px_rgba(0,0,0,0.4)] hover:border-white/20 transition-all flex flex-col"
            >
              {/* Photo Thumbnail */}
              <div
                className="relative aspect-video bg-black/60 cursor-pointer overflow-hidden group"
                onClick={() => setPreviewImage(record.imageUrl)}
              >
                <img
                  src={record.imageUrl}
                  alt={record.title}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/20 p-3 flex flex-col justify-between">
                  <div className="flex items-center justify-between">
                    <span className="px-2.5 py-1 bg-black/60 backdrop-blur-md border border-white/10 text-[10px] font-bold text-emerald-400 rounded-lg flex items-center gap-1">
                      {record.category === "Meals" && <Utensils className="w-3 h-3 text-amber-400" />}
                      {record.category === "Workout Progress" && <Dumbbell className="w-3 h-3 text-cyan-400" />}
                      {record.category === "Lab Reports" && <Microscope className="w-3 h-3 text-violet-400" />}
                      {record.category === "Prescriptions" && <Pill className="w-3 h-3 text-pink-400" />}
                      {record.category === "General" && <ClipboardList className="w-3 h-3 text-emerald-400" />}
                      {record.category}
                    </span>
                    <span className="text-[10px] font-mono text-slate-300 bg-black/60 backdrop-blur-md px-2 py-0.5 rounded-md border border-white/10">
                      {record.date}
                    </span>
                  </div>

                  <span className="text-[10px] font-bold text-white/80 opacity-0 group-hover:opacity-100 transition-opacity bg-black/70 px-2.5 py-1 rounded-lg self-center backdrop-blur-sm flex items-center gap-1">
                    <ZoomIn className="w-3 h-3" /> Click to Zoom Photo
                  </span>
                </div>
              </div>

              {/* Record Content */}
              <div className="p-4 flex-1 flex flex-col justify-between">
                <div>
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <h3 className="text-sm font-black text-white line-clamp-1">{record.title}</h3>
                    {record.isShared && (
                      <span className="text-[9px] bg-violet-500/10 border border-violet-500/20 text-violet-400 font-bold px-2 py-0.5 rounded-md shrink-0">
                        @{record.ownerUsername}
                      </span>
                    )}
                  </div>

                  {record.notes && (
                    <p className="text-xs text-slate-400 mb-3 line-clamp-2">{record.notes}</p>
                  )}

                  {record.sharedWithUsernames.length > 0 && (
                    <div className="mb-3 text-[9.5px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-xl flex items-center gap-1.5">
                      <Users className="w-3 h-3 text-emerald-400" />
                      <span>Shared with:</span>
                      <span className="text-slate-200">{record.sharedWithUsernames.map(u => `@${u}`).join(", ")}</span>
                    </div>
                  )}
                </div>

                {/* Actions: Likes & Comments */}
                <div className="pt-3 border-t border-white/5 space-y-3">
                  <div className="flex items-center justify-between">
                    <button
                      onClick={() => handleToggleLike(record._id)}
                      className={`flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                        record.likedByMe
                          ? "bg-pink-500/20 border-pink-500/40 text-pink-400"
                          : "bg-white/[0.04] border-white/10 text-slate-400 hover:text-white"
                      }`}
                    >
                      <Heart className={`w-3.5 h-3.5 ${record.likedByMe ? "fill-pink-500 text-pink-500" : "text-slate-400"}`} />
                      <span>{record.likeCount}</span>
                    </button>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => { setSelectedRecordId(record._id); setShowShareModal(true); }}
                        className="p-1.5 bg-white/[0.04] border border-white/10 text-slate-400 hover:text-white rounded-lg transition-all cursor-pointer text-xs"
                        title="Share photo with a friend"
                      >
                        <Share2 className="w-3.5 h-3.5 text-slate-400" />
                      </button>
                      {!record.isShared && (
                        <button
                          onClick={() => handleDeleteRecord(record._id)}
                          className="p-1.5 bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 rounded-lg transition-all cursor-pointer text-xs"
                          title="Delete photo"
                        >
                          <Trash2 className="w-3.5 h-3.5 text-red-400" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Comment List */}
                  {record.comments.length > 0 && (
                    <div className="space-y-1.5 max-h-28 overflow-y-auto pr-1">
                      {record.comments.map((c, i) => (
                        <div key={i} className="text-[10px] bg-white/[0.02] border border-white/5 p-1.5 rounded-lg">
                          <span className="font-bold text-violet-400">@{c.username}: </span>
                          <span className="text-slate-300">{c.text}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Add Comment Input */}
                  <div className="flex gap-1.5">
                    <input
                      type="text"
                      placeholder="Add a comment..."
                      value={commentInputs[record._id] || ""}
                      onChange={e => setCommentInputs({ ...commentInputs, [record._id]: e.target.value })}
                      onKeyDown={e => e.key === "Enter" && handleAddComment(record._id)}
                      className="flex-1 bg-white/[0.04] border border-white/[0.08] rounded-xl px-2.5 py-1.5 text-xs text-slate-200 outline-none focus:border-emerald-500/40"
                    />
                    <button
                      onClick={() => handleAddComment(record._id)}
                      disabled={!commentInputs[record._id]?.trim()}
                      className="px-3 py-1.5 bg-emerald-500 text-white text-xs font-bold rounded-xl cursor-pointer disabled:opacity-40"
                    >
                      Post
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Add Photo Modal ── */}
      {showAddModal && (
        <>
          <div className="fixed inset-0 bg-black/75 z-50 backdrop-blur-sm" onClick={() => setShowAddModal(false)} />
          <div className="fixed inset-0 z-50 flex items-center justify-center px-4 pointer-events-none">
            <div className="w-full max-w-lg bg-[#0d0d1a] border border-white/[0.08] rounded-3xl shadow-[0_20px_60px_rgba(0,0,0,0.8)] pointer-events-auto p-6 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between pb-3 border-b border-white/5 mb-4">
                <div>
                  <h3 className="text-base font-black text-white flex items-center gap-2">
                    <Camera className="w-4 h-4 text-emerald-400" /> Upload Health Photo
                  </h3>
                  <p className="text-[9px] text-slate-500 uppercase tracking-widest mt-0.5">Cloudinary Image Integration</p>
                </div>
                <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-white text-xl">✕</button>
              </div>

              {formErr && (
                <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-bold rounded-xl flex items-center gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5" /> {formErr}
                </div>
              )}

              <form onSubmit={handleAddSubmit} className="space-y-4">
                {/* Cloudinary Settings Accordion */}
                <div className="p-3 bg-white/[0.02] border border-white/5 rounded-2xl space-y-2">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                    <Settings className="w-3.5 h-3.5 text-emerald-400" /> Cloudinary Settings (Optional)
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[9px] text-slate-500 block mb-0.5">Cloud Name</label>
                      <input
                        type="text"
                        placeholder="e.g. demo"
                        value={cloudName}
                        onChange={e => setCloudName(e.target.value)}
                        className="w-full bg-white/[0.04] border border-white/10 rounded-lg px-2 py-1 text-xs text-white outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-[9px] text-slate-500 block mb-0.5">Upload Preset</label>
                      <input
                        type="text"
                        placeholder="e.g. unsigned_preset"
                        value={uploadPreset}
                        onChange={e => setUploadPreset(e.target.value)}
                        className="w-full bg-white/[0.04] border border-white/10 rounded-lg px-2 py-1 text-xs text-white outline-none"
                      />
                    </div>
                  </div>
                </div>

                {/* File Upload Box */}
                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1">Select Photo:</label>
                  <input
                    type="file"
                    accept="image/*"
                    ref={fileInputRef}
                    onChange={handleImageFileChange}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full py-6 border-2 border-dashed border-white/20 hover:border-emerald-500/50 rounded-2xl flex flex-col items-center justify-center gap-2 bg-white/[0.02] transition-colors cursor-pointer"
                  >
                    {uploadingImg ? (
                      <div className="flex items-center gap-2">
                        <div className="w-5 h-5 border-2 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin" />
                        <span className="text-xs text-emerald-400 font-bold">Uploading to Cloudinary...</span>
                      </div>
                    ) : imageUrl ? (
                      <div className="flex items-center gap-3 px-3">
                        <img src={imageUrl} alt="Preview" className="w-16 h-12 object-cover rounded-xl border border-white/10" />
                        <span className="text-xs font-bold text-emerald-400">Photo Selected (Click to change)</span>
                      </div>
                    ) : (
                      <>
                        <Camera className="w-8 h-8 text-slate-400 opacity-60" />
                        <span className="text-xs font-bold text-slate-300">Click to choose image file</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Title */}
                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1">Title / Caption:</label>
                  <input
                    type="text"
                    placeholder="e.g. Post-workout meal prep"
                    value={title}
                    onChange={e => setTitle(e.target.value)}
                    className="w-full bg-white/[0.04] border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-emerald-500/40"
                  />
                </div>

                {/* Category & Date */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold text-slate-300 block mb-1">Category:</label>
                    <select
                      value={category}
                      onChange={e => setCategory(e.target.value as HealthRecord["category"])}
                      className="w-full bg-[#1a1a2e] border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none"
                    >
                      <option value="Meals">Meals</option>
                      <option value="Workout Progress">Workout Progress</option>
                      <option value="Lab Reports">Lab Reports</option>
                      <option value="Prescriptions">Prescriptions</option>
                      <option value="General">General</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-300 block mb-1">Date:</label>
                    <input
                      type="date"
                      value={date}
                      onChange={e => setDate(e.target.value)}
                      className="w-full bg-[#1a1a2e] border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none"
                    />
                  </div>
                </div>

                {/* Notes */}
                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1">Notes / Description:</label>
                  <textarea
                    rows={2}
                    placeholder="Add details about calories, macros, workout metrics..."
                    value={notes}
                    onChange={e => setNotes(e.target.value)}
                    className="w-full bg-white/[0.04] border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-emerald-500/40 resize-none"
                  />
                </div>

                {/* Share with Friend Option */}
                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1">Share Photo with Friend (Optional):</label>
                  <select
                    value={selectedFriendToShare}
                    onChange={e => setSelectedFriendToShare(e.target.value)}
                    className="w-full bg-[#1a1a2e] border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none"
                  >
                    <option value="">Don't share (Keep Private)</option>
                    {friends.map(f => (
                      <option key={f._id} value={f._id}>Share with @{f.username}</option>
                    ))}
                  </select>
                </div>

                <button
                  type="submit"
                  disabled={submitting || uploadingImg || !title.trim() || !imageUrl}
                  className="w-full py-3 bg-emerald-500 hover:bg-emerald-600 disabled:bg-slate-800 disabled:text-slate-600 text-white font-black text-xs uppercase tracking-widest rounded-xl transition-all cursor-pointer shadow-[0_0_16px_rgba(16,185,129,0.3)] flex items-center justify-center gap-2"
                >
                  {submitting ? "Uploading & Saving..." : "Save Health Photo"}
                </button>
              </form>
            </div>
          </div>
        </>
      )}

      {/* ── Share Modal ── */}
      {showShareModal && (
        <>
          <div className="fixed inset-0 bg-black/75 z-50 backdrop-blur-sm" onClick={() => setShowShareModal(false)} />
          <div className="fixed inset-0 z-50 flex items-center justify-center px-4 pointer-events-none">
            <div className="w-full max-w-md bg-[#0d0d1a] border border-white/[0.08] rounded-3xl shadow-[0_20px_60px_rgba(0,0,0,0.8)] pointer-events-auto p-5">
              <div className="flex items-center justify-between pb-3 border-b border-white/5 mb-4">
                <div>
                  <h3 className="text-sm font-black text-white">Share Health Vault & Photos</h3>
                  <p className="text-[9px] text-slate-500 uppercase tracking-widest mt-0.5">Live view access for a friend</p>
                </div>
                <button onClick={() => setShowShareModal(false)} className="text-slate-400 hover:text-white">✕</button>
              </div>

              {shareMsg && (
                <div className="mb-4 p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold rounded-xl">
                  {shareMsg}
                </div>
              )}

              {shareErr && (
                <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-bold rounded-xl flex items-center gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5" /> {shareErr}
                </div>
              )}

              <p className="text-xs text-slate-400 mb-2 font-medium">Select Friend:</p>

              {friends.length === 0 ? (
                <div className="text-center py-6 border border-dashed border-white/10 rounded-xl mb-4">
                  <p className="text-xs text-slate-500">No friends found yet.</p>
                  <p className="text-[10px] text-slate-600 mt-1">Add friends in the Chat / Connections tab first!</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-48 overflow-y-auto mb-4 pr-1">
                  {friends.map(friend => (
                    <div
                      key={friend._id}
                      onClick={() => setSelectedShareFriend(friend._id)}
                      className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all ${
                        shareFriend === friend._id
                          ? "bg-violet-500/20 border-violet-500/40 text-white"
                          : "bg-white/[0.03] border-white/5 text-slate-300 hover:bg-white/[0.06]"
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-lg bg-violet-500/10 border border-violet-500/20 flex items-center justify-center text-xs font-black text-violet-400 uppercase">
                          {friend.username.charAt(0)}
                        </div>
                        <span className="text-xs font-bold">{friend.username}</span>
                      </div>
                      {shareFriend === friend._id && (
                        <span className="text-xs font-bold text-violet-400">✓ Selected</span>
                      )}
                    </div>
                  ))}
                </div>
              )}

              <button
                onClick={handleShareVault}
                disabled={shareLoading || !shareFriend}
                className="w-full py-2.5 bg-violet-600 hover:bg-violet-500 disabled:bg-slate-800 disabled:text-slate-600 text-white font-black text-xs uppercase tracking-widest rounded-xl transition-all cursor-pointer shadow-[0_0_16px_rgba(139,92,246,0.3)] flex items-center justify-center gap-2"
              >
                {shareLoading ? "Sharing..." : "Share Live Health Access"}
              </button>
            </div>
          </div>
        </>
      )}

      {/* ── Photo Lightbox Preview Modal ── */}
      {previewImage && (
        <div
          className="fixed inset-0 bg-black/90 z-[9999] flex items-center justify-center p-4 cursor-pointer backdrop-blur-md"
          onClick={() => setPreviewImage(null)}
        >
          <div className="relative max-w-4xl max-h-[90vh] flex flex-col items-center">
            <button
              onClick={() => setPreviewImage(null)}
              className="absolute -top-10 right-0 text-white text-2xl font-black bg-white/10 px-3 py-1 rounded-xl hover:bg-white/20"
            >
              ✕
            </button>
            <img
              src={previewImage}
              alt="Expanded view"
              className="max-w-full max-h-[85vh] object-contain rounded-2xl border border-white/10 shadow-[0_0_50px_rgba(0,0,0,0.9)]"
            />
          </div>
        </div>
      )}

    </div>
  );
}
