import XEUtils from 'xe-utils'
import GlobalConfig from '../../v-x-e-table/src/conf'
import VXETable from '../../v-x-e-table'
import vSize from '../../mixins/size'
import UtilTools from '../../tools/utils'
import DomTools from '../../tools/dom'
import { getSlotVNs } from '../../tools/vn'
import { GlobalEvent } from '../../tools/event'
import { warnLog, errLog } from '../../tools/log'
import draggable from 'vuedraggable'

const renderDropdowns = (h, _vm, item, isBtn) => {
  const { _e } = _vm
  const { dropdowns } = item
  if (dropdowns) {
    return dropdowns.map(child => {
      return child.visible === false ? _e() : h('vxe-button', {
        on: {
          click: evnt => isBtn ? _vm.btnEvent(evnt, child) : _vm.tolEvent(evnt, child)
        },
        props: {
          disabled: child.disabled,
          loading: child.loading,
          type: child.type,
          icon: child.icon,
          circle: child.circle,
          round: child.round,
          status: child.status,
          content: child.name
        }
      })
    })
  }
  return []
}

/**
 * 渲染按钮
 */
function renderBtns (h, _vm) {
  const { _e, $scopedSlots, $xegrid, $xetable, buttons = [] } = _vm
  const buttonsSlot = $scopedSlots.buttons
  if (buttonsSlot) {
    return buttonsSlot.call(_vm, { $grid: $xegrid, $table: $xetable }, h)
  }
  return buttons.map(item => {
    const { dropdowns, buttonRender } = item
    const compConf = buttonRender ? VXETable.renderer.get(buttonRender.name) : null
    if (item.visible === false) {
      return _e()
    }
    if (compConf) {
      const renderToolbarButton = compConf.renderToolbarButton || compConf.renderButton
      const toolbarButtonClassName = compConf.toolbarButtonClassName
      const params = { $grid: $xegrid, $table: $xetable, button: item }
      if (renderToolbarButton) {
        return h('span', {
          class: ['vxe-button--item', toolbarButtonClassName ? (XEUtils.isFunction(toolbarButtonClassName) ? toolbarButtonClassName(params) : toolbarButtonClassName) : '']
        }, getSlotVNs(renderToolbarButton.call(_vm, h, buttonRender, params)))
      }
    }
    return h('vxe-button', {
      on: {
        click: evnt => _vm.btnEvent(evnt, item)
      },
      props: {
        disabled: item.disabled,
        loading: item.loading,
        type: item.type,
        icon: item.icon,
        circle: item.circle,
        round: item.round,
        status: item.status,
        content: item.name,
        destroyOnClose: item.destroyOnClose,
        placement: item.placement,
        transfer: item.transfer
      },
      scopedSlots: dropdowns && dropdowns.length ? {
        dropdowns: () => renderDropdowns(h, _vm, item, true)
      } : null
    })
  })
}

/**
 * 渲染右侧工具
 */
function renderRightTools (h, _vm) {
  const { _e, $scopedSlots, $xetable, $xegrid, tools = [] } = _vm
  const toolsSlot = $scopedSlots.tools
  if (toolsSlot) {
    return toolsSlot.call(_vm, { $table: $xetable, $grid: $xegrid }, h)
  }
  return tools.map(item => {
    const { dropdowns, toolRender } = item
    const compConf = toolRender ? VXETable.renderer.get(toolRender.name) : null
    if (item.visible === false) {
      return _e()
    }
    if (compConf) {
      const { renderToolbarTool } = compConf
      if (renderToolbarTool) {
        const toolbarToolClassName = compConf.toolbarToolClassName
        const params = { $table: $xetable, $grid: $xegrid, tool: item }
        return h('span', {
          class: ['vxe-tool--item', toolbarToolClassName ? (XEUtils.isFunction(toolbarToolClassName) ? toolbarToolClassName(params) : toolbarToolClassName) : '']
        }, getSlotVNs(renderToolbarTool.call(_vm, h, toolRender, params)))
      }
    }
    return h('vxe-button', {
      on: {
        click: evnt => _vm.tolEvent(evnt, item)
      },
      props: {
        disabled: item.disabled,
        loading: item.loading,
        type: item.type,
        icon: item.icon,
        circle: item.circle,
        round: item.round,
        status: item.status,
        content: item.name,
        destroyOnClose: item.destroyOnClose,
        placement: item.placement,
        transfer: item.transfer
      },
      scopedSlots: dropdowns && dropdowns.length ? {
        dropdowns: () => renderDropdowns(h, _vm, item, false)
      } : null
    })
  })
}

function renderChildren (columns, checkMethod, customOpts, isMaxFixedColumn, h, _vm) {
  const cols = []
  XEUtils.eachTree(columns, (column, index, items, path, parent) => {
    const colTitle = UtilTools.formatText(column.getTitle(), 1)
    const colKey = column.getKey()
    const isColGroup = column.children && column.children.length
    const isDisabled = checkMethod ? !checkMethod({ column }) : false

    if (isColGroup || colKey) {
      const isChecked = column.visible
      const isIndeterminate = column.halfVisible
      cols.push(
        h('li', {
          class: ['vxe-custom--option', `level--${column.level}`, {
            'is--group': isColGroup
          }],
          props: {
            key: colKey
          }
        }, [
          h('div', {
            title: colTitle,
            class: ['vxe-custom--checkbox-option', {
              'is--checked': isChecked,
              'is--indeterminate': isIndeterminate,
              'is--disabled': isDisabled
            }],
            attrs: {
              title: colTitle
            },
            on: {
              click: () => {
                if (!isDisabled) {
                  _vm.changeCustomOption(column)
                }
              }
            }
          }, [
            h('span', {
              class: ['vxe-checkbox--icon', isIndeterminate ? GlobalConfig.icon.TABLE_CHECKBOX_INDETERMINATE : (isChecked ? GlobalConfig.icon.TABLE_CHECKBOX_CHECKED : GlobalConfig.icon.TABLE_CHECKBOX_UNCHECKED)]
            }),
            h('span', {
              class: 'vxe-checkbox--label'
            }, colTitle)
          ])
        ])
      )
    }
  })

  return cols
}

function renderCustoms (h, _vm) {
  const { $xetable, customStore, customOpts, columns } = _vm
  const isMaxFixedColumn = $xetable ? $xetable.isMaxFixedColumn : true
  const cols = []
  const customBtnOns = {}
  const customWrapperOns = {
    change: _vm.orderChangeEvent
  }
  const checkMethod = $xetable ? $xetable.customOpts.checkMethod : null
  if (customOpts.trigger === 'manual') {
    // 手动触发
  } else if (customOpts.trigger === 'hover') {
    // hover 触发
    customBtnOns.mouseenter = _vm.handleMouseenterSettingEvent
    customBtnOns.mouseleave = _vm.handleMouseleaveSettingEvent
    customWrapperOns.mouseenter = _vm.handleWrapperMouseenterEvent
    customWrapperOns.mouseleave = _vm.handleWrapperMouseleaveEvent
  } else {
    // 点击触发
    customBtnOns.click = _vm.handleClickSettingEvent
  }
  XEUtils.eachTree(columns, (column, index, items, path, parent) => {
    const colTitle = UtilTools.formatText(column.getTitle(), 1)
    const colKey = column.getKey()
    const isColGroup = column.children && column.children.length
    const isDisabled = checkMethod ? !checkMethod({ column }) : false
    const level = column.level

    if (level === 1 && (isColGroup || colKey)) {
      const isChecked = column.visible
      const isIndeterminate = column.halfVisible
      cols.push(
        h('li', {
          class: ['vxe-custom--option', 'level--1', 'level--top', {
            'is--group': isColGroup
          }],
          props: {
            key: colKey
          }
        }, [
          h('div', {
            class: ['level--top-wrapper']
          }, [
            h('div', {
              title: colTitle,
              class: ['vxe-custom--checkbox-option', {
                'is--checked': isChecked,
                'is--indeterminate': isIndeterminate,
                'is--disabled': isDisabled
              }],
              attrs: {
                title: colTitle
              },
              on: {
                click: () => {
                  if (!isDisabled) {
                    _vm.changeCustomOption(column)
                  }
                }
              }
            }, [
              h('span', {
                class: ['vxe-checkbox--icon', isIndeterminate ? GlobalConfig.icon.TABLE_CHECKBOX_INDETERMINATE : (isChecked ? GlobalConfig.icon.TABLE_CHECKBOX_CHECKED : GlobalConfig.icon.TABLE_CHECKBOX_UNCHECKED)]
              }),
              h('span', {
                class: 'vxe-checkbox--label'
              }, colTitle)
            ]),
            customOpts.allowFixed ? h('div', {
              class: 'vxe-custom--fixed-option'
            }, [
              h('span', {
                class: ['vxe-custom--fixed-left-option', column.fixed === 'left' ? GlobalConfig.icon.TOOLBAR_TOOLS_FIXED_LEFT_ACTIVED : GlobalConfig.icon.TOOLBAR_TOOLS_FIXED_LEFT, {
                  'is--checked': column.fixed === 'left',
                  'is--disabled': isMaxFixedColumn && !column.fixed
                }],
                attrs: {
                  title: GlobalConfig.i18n(column.fixed === 'left' ? 'vxe.toolbar.cancelfixed' : 'vxe.toolbar.fixedLeft')
                },
                on: {
                  click: () => {
                    _vm.changeFixedOption(column, 'left')
                  }
                }
              }),
              h('span', {
                class: ['vxe-custom--fixed-right-option', column.fixed === 'right' ? GlobalConfig.icon.TOOLBAR_TOOLS_FIXED_RIGHT_ACTIVED : GlobalConfig.icon.TOOLBAR_TOOLS_FIXED_RIGHT, {
                  'is--checked': column.fixed === 'right',
                  'is--disabled': isMaxFixedColumn && !column.fixed
                }],
                attrs: {
                  title: GlobalConfig.i18n(column.fixed === 'right' ? 'vxe.toolbar.cancelfixed' : 'vxe.toolbar.fixedRight')
                },
                on: {
                  click: () => {
                    _vm.changeFixedOption(column, 'right')
                  }
                }
              })
            ]) : null,
            customOpts.allowOrder ? h('span', {
              class: ['vxe-custom--order-option', GlobalConfig.icon.TOOLBAR_TOOLS_ORDER],
              attrs: {
                title: GlobalConfig.i18n('vxe.toolbar.order')
              }
            }) : null
          ]),
          isColGroup ? h('ul', {
            class: 'vxe-custom--body2'
          }, renderChildren(column.children, checkMethod, customOpts, isMaxFixedColumn, h, _vm)) : null
        ])
      )
    }
  })
  const isAllChecked = customStore.isAll
  const isAllIndeterminate = customStore.isIndeterminate
  return h('div', {
    class: ['vxe-custom--wrapper', {
      'is--active': customStore.visible
    }],
    ref: 'customWrapper'
  }, [
    h('vxe-button', {
      props: {
        circle: true,
        icon: customOpts.icon || GlobalConfig.icon.TOOLBAR_TOOLS_CUSTOM
      },
      attrs: {
        title: GlobalConfig.i18n('vxe.toolbar.custom')
      },
      on: customBtnOns
    }),
    h('div', {
      class: 'vxe-custom--option-wrapper'
    }, [
      h('ul', {
        class: 'vxe-custom--header'
      }, [
        h('li', {
          class: 'vxe-custom--option'
        }, [
          h('div', {
            class: ['vxe-custom--checkbox-option', {
              'is--checked': isAllChecked,
              'is--indeterminate': isAllIndeterminate
            }],
            attrs: {
              title: GlobalConfig.i18n('vxe.table.allTitle')
            },
            on: {
              click: _vm.allCustomEvent
            }
          }, [
            h('span', {
              class: ['vxe-checkbox--icon', isAllIndeterminate ? GlobalConfig.icon.TABLE_CHECKBOX_INDETERMINATE : (isAllChecked ? GlobalConfig.icon.TABLE_CHECKBOX_CHECKED : GlobalConfig.icon.TABLE_CHECKBOX_UNCHECKED)]
            }),
            h('span', {
              class: 'vxe-checkbox--label'
            }, GlobalConfig.i18n('vxe.toolbar.customAll'))
          ])
        ])
      ]),
      h('draggable', {
        class: 'vxe-custom--body',
        props: {
          list: _vm.columns,
          tag: 'ul',
          draggable: '.level-top'
        },
        attrs: {
          handle: '.vxe-custom--order-option'
        },
        on: customWrapperOns
      }, cols),
      customOpts.showFooter || customOpts.isFooter ? h('div', {
        class: 'vxe-custom--footer'
      }, [
        h('button', {
          class: 'btn--reset',
          on: {
            click: _vm.resetCustomEvent
          }
        }, customOpts.resetButtonText || GlobalConfig.i18n('vxe.toolbar.customRestore')),
        h('button', {
          class: 'btn--confirm',
          on: {
            click: _vm.confirmCustomEvent
          }
        }, customOpts.confirmButtonText || GlobalConfig.i18n('vxe.toolbar.customConfirm'))
      ]) : null
    ])
  ])
}

export default {
  name: 'VxeToolbar',
  mixins: [vSize],
  props: {
    loading: Boolean,
    refresh: [Boolean, Object],
    import: [Boolean, Object],
    export: [Boolean, Object],
    print: [Boolean, Object],
    zoom: [Boolean, Object],
    custom: [Boolean, Object],
    buttons: { type: Array, default: () => GlobalConfig.toolbar.buttons },
    tools: { type: Array, default: () => GlobalConfig.toolbar.tools },
    perfect: { type: Boolean, default: () => GlobalConfig.toolbar.perfect },
    size: { type: String, default: () => GlobalConfig.toolbar.size || GlobalConfig.size },
    className: [String, Function]
  },
  inject: {
    $xegrid: {
      default: null
    }
  },
  data () {
    return {
      $xetable: null,
      isRefresh: false,
      columns: [],
      customStore: {
        isAll: false,
        isIndeterminate: false,
        visible: false
      }
    }
  },
  components: {
    draggable
  },
  computed: {
    refreshOpts () {
      return Object.assign({}, GlobalConfig.toolbar.refresh, this.refresh)
    },
    importOpts () {
      return Object.assign({}, GlobalConfig.toolbar.import, this.import)
    },
    exportOpts () {
      return Object.assign({}, GlobalConfig.toolbar.export, this.export)
    },
    printOpts () {
      return Object.assign({}, GlobalConfig.toolbar.print, this.print)
    },
    zoomOpts () {
      return Object.assign({}, GlobalConfig.toolbar.zoom, this.zoom)
    },
    customOpts () {
      return Object.assign({}, GlobalConfig.toolbar.custom, this.custom)
    }
  },
  created () {
    const { refresh, refreshOpts, customOpts } = this
    this.$nextTick(() => {
      const $xetable = this.fintTable()
      const queryMethod = refreshOpts.queryMethod || refreshOpts.query
      if (refresh && !this.$xegrid && !queryMethod) {
        warnLog('vxe.error.notFunc', ['queryMethod'])
      }
      if ($xetable) {
        $xetable.connect(this)
      }
      if (process.env.VUE_APP_VXE_TABLE_ENV === 'development') {
        if (customOpts.isFooter) {
          warnLog('vxe.error.notValidators', ['custom.isFooter', 'custom.showFooter'])
        }
        if (this.buttons) {
          this.buttons.forEach(item => {
            const { buttonRender } = item
            const compConf = buttonRender ? VXETable.renderer.get(buttonRender.name) : null
            if (compConf && compConf.renderButton) {
              warnLog('vxe.error.delFunc', ['renderButton', 'renderToolbarButton'])
            }
          })
        }
      }
    })
    GlobalEvent.on(this, 'mousedown', this.handleGlobalMousedownEvent)
    GlobalEvent.on(this, 'blur', this.handleGlobalBlurEvent)
  },
  destroyed () {
    GlobalEvent.off(this, 'mousedown')
    GlobalEvent.off(this, 'blur')
  },
  render (h) {
    const { _e, $xegrid, perfect, loading, importOpts, exportOpts, refresh, refreshOpts, zoom, zoomOpts, custom, vSize, className } = this
    return h('div', {
      class: ['vxe-toolbar', className ? (XEUtils.isFunction(className) ? className({ $toolbar: this }) : className) : '', {
        [`size--${vSize}`]: vSize,
        'is--perfect': perfect,
        'is--loading': loading
      }]
    }, [
      h('div', {
        class: 'vxe-buttons--wrapper'
      }, renderBtns(h, this)),
      h('div', {
        class: 'vxe-tools--wrapper'
      }, renderRightTools(h, this)),
      h('div', {
        class: 'vxe-tools--operate'
      }, [
        this.import ? h('vxe-button', {
          props: {
            circle: true,
            icon: importOpts.icon || GlobalConfig.icon.TOOLBAR_TOOLS_IMPORT
          },
          attrs: {
            title: GlobalConfig.i18n('vxe.toolbar.import')
          },
          on: {
            click: this.importEvent
          }
        }) : _e(),
        this.export ? h('vxe-button', {
          props: {
            circle: true,
            icon: exportOpts.icon || GlobalConfig.icon.TOOLBAR_TOOLS_EXPORT
          },
          attrs: {
            title: GlobalConfig.i18n('vxe.toolbar.export')
          },
          on: {
            click: this.exportEvent
          }
        }) : _e(),
        this.print ? h('vxe-button', {
          props: {
            circle: true,
            icon: this.printOpts.icon || GlobalConfig.icon.TOOLBAR_TOOLS_PRINT
          },
          attrs: {
            title: GlobalConfig.i18n('vxe.toolbar.print')
          },
          on: {
            click: this.printEvent
          }
        }) : _e(),
        refresh ? h('vxe-button', {
          props: {
            circle: true,
            icon: this.isRefresh ? (refreshOpts.iconLoading || GlobalConfig.icon.TOOLBAR_TOOLS_REFRESH_LOADING) : (refreshOpts.icon || GlobalConfig.icon.TOOLBAR_TOOLS_REFRESH)
          },
          attrs: {
            title: GlobalConfig.i18n('vxe.toolbar.refresh')
          },
          on: {
            click: this.refreshEvent
          }
        }) : _e(),
        zoom && $xegrid ? h('vxe-button', {
          props: {
            circle: true,
            icon: $xegrid.isMaximized() ? (zoomOpts.iconOut || GlobalConfig.icon.TOOLBAR_TOOLS_MINIMIZE) : (zoomOpts.iconIn || GlobalConfig.icon.TOOLBAR_TOOLS_FULLSCREEN)
          },
          attrs: {
            title: GlobalConfig.i18n(`vxe.toolbar.zoom${$xegrid.isMaximized() ? 'Out' : 'In'}`)
          },
          on: {
            click: $xegrid.triggerZoomEvent
          }
        }) : _e(),
        custom ? renderCustoms(h, this) : _e()
      ])
    ])
  },
  methods: {
    syncUpdate (params) {
      const { collectColumn, $table } = params
      this.$xetable = $table
      this.columns = collectColumn
    },
    fintTable () {
      const { $children } = this.$parent
      const selfIndex = $children.indexOf(this)
      return XEUtils.find($children, (comp, index) => comp && comp.loadData && index > selfIndex && comp.$vnode.componentOptions.tag === 'vxe-table')
    },
    checkTable () {
      if (this.$xetable) {
        return true
      }
      errLog('vxe.error.barUnableLink')
    },
    showCustom () {
      this.customStore.visible = true
      this.checkCustomStatus()
    },
    closeCustom () {
      const { custom, customStore } = this
      if (customStore.visible) {
        customStore.visible = false
        if (custom && !customStore.immediate) {
          this.handleTableCustom()
        }
      }
    },
    confirmCustomEvent (evnt) {
      this.closeCustom()
      this.emitCustomEvent('confirm', evnt)
    },
    customOpenEvent (evnt) {
      const { customStore } = this
      if (this.checkTable()) {
        if (!customStore.visible) {
          this.showCustom()
          this.emitCustomEvent('open', evnt)
        }
      }
    },
    customColseEvent (evnt) {
      const { customStore } = this
      if (customStore.visible) {
        this.closeCustom()
        this.emitCustomEvent('close', evnt)
      }
    },
    resetCustomEvent (evnt) {
      const { $xetable } = this
      $xetable.resetColumn(true)
      $xetable.resetOrder()
      this.closeCustom()
      this.emitCustomEvent('reset', evnt)
    },
    emitCustomEvent (type, evnt) {
      const { $xetable, $xegrid } = this
      const comp = $xegrid || $xetable
      comp.$emit('custom', { type, $table: $xetable, $grid: $xegrid, $event: evnt })
    },
    changeCustomOption (column) {
      const isChecked = !column.visible
      XEUtils.eachTree([column], (item) => {
        item.visible = isChecked
        item.halfVisible = false
      })
      this.handleOptionCheck(column)
      if (this.custom && this.customOpts.immediate) {
        this.handleTableCustom()
      }
      this.checkCustomStatus()
    },
    changeFixedOption (column, colFixed) {
      const { $xetable } = this
      if (column.fixed === colFixed) {
        $xetable.clearColumnFixed(column)
      } else {
        if (!$xetable.isMaxFixedColumn && column.fixed !== colFixed) {
          $xetable.setColumnFixed(column, colFixed)
        }
      }
    },
    handleOptionCheck (column) {
      const matchObj = XEUtils.findTree(this.columns, item => item === column)
      if (matchObj && matchObj.parent) {
        const { parent } = matchObj
        if (parent.children && parent.children.length) {
          parent.visible = parent.children.every(column => column.visible)
          parent.halfVisible = !parent.visible && parent.children.some(column => column.visible || column.halfVisible)
          this.handleOptionCheck(parent)
        }
      }
    },
    handleTableCustom () {
      const { $xetable } = this
      $xetable.handleCustom()
    },
    checkCustomStatus () {
      const { $xetable, columns } = this
      const checkMethod = $xetable.customOpts.checkMethod
      this.customStore.isAll = columns.every(column => (checkMethod ? !checkMethod({ column }) : false) || column.visible)
      this.customStore.isIndeterminate = !this.customStore.isAll && columns.some(column => (!checkMethod || checkMethod({ column })) && (column.visible || column.halfVisible))
    },
    allCustomEvent () {
      const { $xetable, columns, customStore } = this
      const checkMethod = $xetable.customOpts.checkMethod
      const isAll = !customStore.isAll
      XEUtils.eachTree(columns, column => {
        if (!checkMethod || checkMethod({ column })) {
          column.visible = isAll
          column.halfVisible = false
        }
      })
      customStore.isAll = isAll
      this.checkCustomStatus()
    },
    handleGlobalMousedownEvent (evnt) {
      if (!DomTools.getEventTargetNode(evnt, this.$refs.customWrapper).flag) {
        this.customColseEvent(evnt)
      }
    },
    handleGlobalBlurEvent (evnt) {
      this.customColseEvent(evnt)
    },
    handleClickSettingEvent (evnt) {
      if (this.customStore.visible) {
        this.customColseEvent(evnt)
      } else {
        this.customOpenEvent(evnt)
      }
    },
    handleMouseenterSettingEvent (evnt) {
      this.customStore.activeBtn = true
      this.customOpenEvent(evnt)
    },
    handleMouseleaveSettingEvent (evnt) {
      const { customStore } = this
      customStore.activeBtn = false
      setTimeout(() => {
        if (!customStore.activeBtn && !customStore.activeWrapper) {
          this.customColseEvent(evnt)
        }
      }, 300)
    },
    handleWrapperMouseenterEvent (evnt) {
      this.customStore.activeWrapper = true
      this.customOpenEvent(evnt)
    },
    handleWrapperMouseleaveEvent (evnt) {
      const { customStore } = this
      customStore.activeWrapper = false
      setTimeout(() => {
        if (!customStore.activeBtn && !customStore.activeWrapper) {
          this.customColseEvent(evnt)
        }
      }, 300)
    },
    refreshEvent (evnt) {
      const { $xegrid, refreshOpts, isRefresh } = this
      if (!isRefresh) {
        const queryMethod = refreshOpts.queryMethod || refreshOpts.query
        if (queryMethod) {
          this.isRefresh = true
          try {
            Promise.resolve(queryMethod({})).catch(e => e).then(() => {
              this.isRefresh = false
            })
          } catch (e) {
            this.isRefresh = false
          }
        } else if ($xegrid) {
          this.isRefresh = true
          $xegrid.triggerToolbarCommitEvent({ code: refreshOpts.code || 'reload' }, evnt).catch(e => e).then(() => {
            this.isRefresh = false
          })
        }
      }
    },
    btnEvent (evnt, item) {
      const { $xegrid, $xetable } = this
      const { code } = item
      if (code) {
        if ($xegrid) {
          $xegrid.triggerToolbarBtnEvent(item, evnt)
        } else {
          const gCommandOpts = VXETable.commands.get(code)
          const params = { code, button: item, $table: $xetable, $grid: $xegrid, $event: evnt }
          if (gCommandOpts) {
            if (gCommandOpts.commandMethod) {
              gCommandOpts.commandMethod(params)
            } else {
              if (process.env.VUE_APP_VXE_TABLE_ENV === 'development') {
                errLog('vxe.error.notCommands', [code])
              }
            }
          }
          this.$emit('button-click', params)
        }
      }
    },
    tolEvent (evnt, item) {
      const { $xegrid, $xetable } = this
      const { code } = item
      if (code) {
        if ($xegrid) {
          $xegrid.triggerToolbarTolEvent(item, evnt)
        } else {
          const gCommandOpts = VXETable.commands.get(code)
          const params = { code, tool: item, $xegrid, $table: $xetable, $event: evnt }
          if (gCommandOpts) {
            if (gCommandOpts.commandMethod) {
              gCommandOpts.commandMethod(params)
            } else {
              if (process.env.VUE_APP_VXE_TABLE_ENV === 'development') {
                errLog('vxe.error.notCommands', [code])
              }
            }
          }
          this.$emit('tool-click', params)
        }
      }
    },
    importEvent () {
      if (this.checkTable()) {
        this.$xetable.openImport(this.importOpts)
      }
    },
    exportEvent () {
      if (this.checkTable()) {
        this.$xetable.openExport(this.exportOpts)
      }
    },
    printEvent () {
      if (this.checkTable()) {
        this.$xetable.openPrint(this.printOpts)
      }
    },
    orderChangeEvent (evnt) {
      const { $xetable } = this
      const { moved } = evnt
      if (moved) {
        XEUtils.arrayEach(this.columns, (column, idx) => {
          column.colSeq = idx
        })
        $xetable.loadColumn2(this.columns)
        $xetable.saveCustomOrder(false)
      }
    }
  }
}
