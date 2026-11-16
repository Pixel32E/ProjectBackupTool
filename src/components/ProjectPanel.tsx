import { useMemo, useState, type MouseEvent as ReactMouseEvent } from "react";

import Icon from "./Icon";
import PopupMenu from "./PopupMenu";
import {
  blockProject,
  projectRoot,
  revealPath,
  selectProject,
  setActiveTag,
  setProjectTag,
  useAppState,
} from "../store/appStore";
import { PROJECT_TAGS, tagLabelOf, type ProjectEntry } from "../lib/types";

type MenuMode = "root" | "tag";

interface MenuState {
  point: { x: number; y: number };
  path: string;
  mode: MenuMode;
}

export default function ProjectPanel() {
  const state = useAppState();
  const root = projectRoot(state);
  const [menu, setMenu] = useState<MenuState | null>(null);

  const filters = useMemo(
    () => [
      { id: null as string | null, label: "全部", count: state.projects.length },
      ...PROJECT_TAGS.map((tag) => ({
        id: tag.id as string | null,
        label: tag.label,
        count: state.projects.filter((project) => project.tag === tag.id).length,
      })),
    ],
    [state.projects],
  );

  const visibleProjects = useMemo(
    () =>
      state.activeTag
        ? state.projects.filter((project) => project.tag === state.activeTag)
        : state.projects,
    [state.projects, state.activeTag],
  );

  const emptyText = (() => {
    if (!root.path) return "请在工具栏选择项目根目录";
    if (!root.exists) return "项目根目录不存在，请重新选择";
    if (state.activeTag) return `暂无「${tagLabelOf(state.activeTag)}」标签的项目`;
    return "该根目录下没有子文件夹";
  })();

  const menuProject = menu
    ? state.projects.find((project) => project.path === menu.path) ?? null
    : null;

  function openMenu(event: ReactMouseEvent, entry: ProjectEntry): void {
    selectProject(entry);
    setMenu({ point: { x: event.clientX, y: event.clientY }, path: entry.path, mode: "root" });
  }

  function closeMenu(): void {
    setMenu(null);
  }

  async function blockItem(): Promise<void> {
    const path = menu?.path;
    closeMenu();
    if (path) await blockProject(path);
  }

  async function openInExplorer(): Promise<void> {
    const path = menu?.path;
    closeMenu();
    await revealPath(path);
  }

  async function chooseTag(tag: string): Promise<void> {
    const path = menu?.path;
    closeMenu();
    if (path) await setProjectTag(path, tag);
  }

  return (
    <div className="card panel">
      <div className="panel__head">
        <h2 className="panel__title">项目</h2>
        <span className="chip">{state.projects.length} 个可备份</span>
      </div>

      <div className="filters">
        {filters.map((filter) => (
          <button
            key={filter.id ?? "all"}
            className={`filterchip${state.activeTag === filter.id ? " is-active" : ""}`}
            onClick={() => setActiveTag(filter.id)}
          >
            <span className="filterchip__label">{filter.label}</span>
            <span className="filterchip__count">{filter.count}</span>
          </button>
        ))}
      </div>

      <section className="section">
        <header className="section__head">
          <Icon name="folder" size={15} />
          <span>{state.activeTag ? tagLabelOf(state.activeTag) : "全部项目"}</span>
          <span className="section__count">{visibleProjects.length} 个</span>
        </header>

        {visibleProjects.length ? (
          <ul className="list">
            {visibleProjects.map((item) => (
              <li
                key={item.path}
                className={`row${state.selectedProjectPath === item.path ? " is-active" : ""}`}
                title={item.path}
                onClick={() => selectProject(item)}
                onContextMenu={(event) => {
                  event.preventDefault();
                  openMenu(event, item);
                }}
              >
                <span className="row__icon">
                  <Icon name="folder" size={15} />
                </span>
                <span className="row__name">{item.name}</span>
                {item.tag && (
                  <span className={`tagchip tagchip--${item.tag}`}>{tagLabelOf(item.tag)}</span>
                )}
                {state.selectedProjectPath === item.path && (
                  <Icon className="row__hint" name="check" size={15} />
                )}
              </li>
            ))}
          </ul>
        ) : (
          <p className="empty">{emptyText}</p>
        )}
      </section>

      {menu && (
        <PopupMenu
          key={menu.mode}
          point={menu.point}
          width={216}
          onClose={closeMenu}
        >
          {menu.mode === "root" ? (
            <>
              <button
                className="menu__item"
                onClick={() => setMenu({ ...menu, mode: "tag" })}
              >
                <Icon name="edit" size={16} />
                <span className="menu__text">
                  <span className="menu__title">添加项目标签</span>
                </span>
                <Icon className="menu__arrow" name="chevronRight" size={15} />
              </button>
              <button className="menu__item" onClick={() => void blockItem()}>
                <Icon name="ban" size={16} />
                <span className="menu__text">
                  <span className="menu__title">屏蔽该文件夹</span>
                </span>
              </button>
              <button className="menu__item" onClick={() => void openInExplorer()}>
                <Icon name="folder" size={16} />
                <span className="menu__text">
                  <span className="menu__title">在文件资源管理器打开</span>
                </span>
              </button>
            </>
          ) : (
            <>
              <button
                className="menu__item"
                onClick={() => setMenu({ ...menu, mode: "root" })}
              >
                <Icon className="menu__back" name="chevronDown" size={15} />
                <span className="menu__text">
                  <span className="menu__title">返回</span>
                </span>
              </button>
              <div className="menu__sep" />
              {PROJECT_TAGS.map((tag) => (
                <button
                  key={tag.id}
                  className="menu__item"
                  onClick={() => void chooseTag(tag.id)}
                >
                  <span className={`tagdot tagdot--${tag.id}`} />
                  <span className="menu__text">
                    <span className="menu__title">{tag.label}</span>
                  </span>
                  {menuProject?.tag === tag.id && (
                    <Icon className="menu__arrow" name="check" size={15} />
                  )}
                </button>
              ))}
              {menuProject?.tag && (
                <>
                  <div className="menu__sep" />
                  <button className="menu__item" onClick={() => void chooseTag("")}>
                    <Icon name="ban" size={16} />
                    <span className="menu__text">
                      <span className="menu__title">清除标签</span>
                    </span>
                  </button>
                </>
              )}
            </>
          )}
        </PopupMenu>
      )}
    </div>
  );
}
