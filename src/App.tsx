import { useEffect } from "react";

import ActionBar from "./components/ActionBar";
import BackupPanel from "./components/BackupPanel";
import DialogHost from "./components/DialogHost";
import ProjectPanel from "./components/ProjectPanel";
import SettingsDialog from "./components/SettingsDialog";
import TitleBar from "./components/TitleBar";
import ToastHost from "./components/ToastHost";
import Toolbar from "./components/Toolbar";
import { init, refreshAll, useAppState } from "./store/appStore";

export default function App() {
  const state = useAppState();

  useEffect(() => {
    void init();

    const onKeydown = (event: KeyboardEvent) => {
      if (event.key === "F5") {
        event.preventDefault();
        void refreshAll();
      }
    };

    window.addEventListener("keydown", onKeydown);
    return () => window.removeEventListener("keydown", onKeydown);
  }, []);

  return (
    <div className="window">
      <TitleBar />

      <main className="workspace">
        <Toolbar />

        <div className="columns">
          <ProjectPanel />
          <BackupPanel />
        </div>

        <ActionBar />
      </main>

      {state.settingsOpen && <SettingsDialog />}
      <DialogHost />
      <ToastHost />
    </div>
  );
}
