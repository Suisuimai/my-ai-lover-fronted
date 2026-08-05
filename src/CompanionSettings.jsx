import { useEffect, useState } from "react";
import { api } from "./api.js";

const CHARACTER_FIELDS = [
  ["name", "NAME", "The name shown for your companion"],
  ["identity", "IDENTITY", "How the companion understands its identity"],
  ["personality", "CORE PERSONALITY", "Stable traits and values"],
  ["speech_style", "SPEECH STYLE", "Length, tone, humor, and forms of address"],
  ["initiative_style", "INITIATIVE", "When to follow up, suggest, or stay quiet"],
  ["conflict_style", "CONFLICT STYLE", "How disagreements, apologies, and repair work"],
  ["boundaries", "COMPANION BOUNDARIES", "Behaviors that should never change with intimacy"],
];

const PROFILE_FIELDS = [
  ["display_name", "YOUR PREFERRED NAME", "How the companion should address you"],
  ["pronouns", "PRONOUNS", "Optional"],
  ["bio", "ABOUT YOU", "Stable background you want the companion to know"],
  ["communication_preferences", "COMMUNICATION PREFERENCES", "For example: listen before offering advice"],
  ["boundaries", "YOUR BOUNDARIES", "Topics or interaction patterns to avoid"],
];

function Fields({ fields, value, onChange }) {
  return fields.map(([key, label, placeholder]) => (
    <label key={key} style={{display:"block",marginTop:12}}>
      <span style={{display:"block",fontSize:9.5,color:"#8E8E93",letterSpacing:"0.09em",marginBottom:6}}>{label}</span>
      {key === "name" || key === "display_name" || key === "pronouns" ? (
        <input
          value={value[key] || ""}
          onChange={(event) => onChange({...value, [key]: event.target.value})}
          placeholder={placeholder}
          style={{width:"100%",boxSizing:"border-box",height:38,border:"0.5px solid rgba(0,0,0,0.1)",borderRadius:12,padding:"0 12px",background:"rgba(0,0,0,0.02)",fontSize:13,outline:"none"}}
        />
      ) : (
        <textarea
          value={value[key] || ""}
          onChange={(event) => onChange({...value, [key]: event.target.value})}
          placeholder={placeholder}
          rows={2}
          style={{width:"100%",boxSizing:"border-box",minHeight:58,border:"0.5px solid rgba(0,0,0,0.1)",borderRadius:12,padding:"10px 12px",background:"rgba(0,0,0,0.02)",fontFamily:"inherit",fontSize:13,resize:"vertical",outline:"none"}}
        />
      )}
    </label>
  ));
}

export default function CompanionSettings() {
  const [character, setCharacter] = useState(null);
  const [profile, setProfile] = useState(null);
  const [busy, setBusy] = useState(true);
  const [message, setMessage] = useState("");

  useEffect(() => {
    let active = true;
    Promise.all([api("/character"), api("/profile")])
      .then(([characterData, profileData]) => {
        if (!active) return;
        setCharacter(characterData.character);
        setProfile(profileData.profile);
      })
      .catch((error) => active && setMessage(error.message))
      .finally(() => active && setBusy(false));
    return () => { active = false; };
  }, []);

  async function save() {
    setBusy(true);
    setMessage("");
    try {
      const [characterData, profileData] = await Promise.all([
        api("/character", {
          method: "PATCH",
          headers: {"Content-Type":"application/json"},
          body: JSON.stringify(character),
        }),
        api("/profile", {
          method: "PATCH",
          headers: {"Content-Type":"application/json"},
          body: JSON.stringify(profile),
        }),
      ]);
      setCharacter(characterData.character);
      setProfile(profileData.profile);
      setMessage("Companion and profile saved.");
    } catch (error) {
      setMessage(error.message);
    } finally {
      setBusy(false);
    }
  }

  if (busy && !character) return <p style={{fontSize:11,color:"#8E8E93",margin:"12px 0"}}>Loading companion profile…</p>;
  if (!character || !profile) return <p role="alert" style={{fontSize:11,color:"#FF3B30",margin:"12px 0"}}>{message || "Profile is unavailable."}</p>;

  return (
    <details style={{marginTop:14,borderTop:"0.5px solid rgba(0,0,0,0.06)",paddingTop:14}}>
      <summary style={{fontSize:12,fontWeight:500,cursor:"pointer",color:"#1C1C1E"}}>Companion & you</summary>
      <p style={{fontSize:12,fontWeight:500,margin:"14px 0 0",color:"#1C1C1E"}}>Companion</p>
      <p style={{fontSize:10.5,color:"#8E8E93",margin:"3px 0 0"}}>Stable across every conversation that belongs to this companion.</p>
      <Fields fields={CHARACTER_FIELDS} value={character} onChange={setCharacter} />

      <div style={{height:"0.5px",background:"rgba(0,0,0,0.06)",margin:"18px 0"}} />
      <p style={{fontSize:12,fontWeight:500,margin:0,color:"#1C1C1E"}}>About you</p>
      <p style={{fontSize:10.5,color:"#8E8E93",margin:"3px 0 0"}}>Only add stable information you want used across conversations.</p>
      <Fields fields={PROFILE_FIELDS} value={profile} onChange={setProfile} />

      <div style={{display:"flex",alignItems:"center",gap:10,marginTop:12}}>
        <button type="button" onClick={save} disabled={busy}
          style={{height:32,padding:"0 16px",border:0,borderRadius:16,background:"#1C1C1E",color:"#F7F6F3",fontSize:11,cursor:busy?"default":"pointer",opacity:busy?0.55:1}}>
          {busy ? "Saving…" : "Save companion & profile"}
        </button>
        {message && <span role={message.includes("saved") ? undefined : "alert"} style={{fontSize:10.5,color:message.includes("saved")?"#8E8E93":"#FF3B30"}}>{message}</span>}
      </div>
    </details>
  );
}
