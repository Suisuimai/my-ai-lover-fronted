import GroundedDiarySettings from "./GroundedDiarySettings.jsx";

export default function MemoryJournalSettings(){
  return <details style={{marginTop:14,borderTop:"0.5px solid rgba(0,0,0,.06)",paddingTop:14}}>
    <summary style={{fontSize:12,fontWeight:500,cursor:"pointer"}}>共同生活日记</summary>
    <GroundedDiarySettings />
  </details>;
}
