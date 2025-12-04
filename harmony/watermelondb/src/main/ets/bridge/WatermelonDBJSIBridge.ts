import { TurboModule, TurboModuleContext } from '@rnoh/react-native-openharmony/ts';
import type common from '@ohos.app.ability.common';
import hilog from '@ohos.hilog';
import { TM } from '../generated/ts';

// Harmony 动态库，提供 native JSI 安装入口（将在 C++ 中实现）
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore: ArkTS 运行时在打包时会解析 .so
import libWatermelonDB from 'libwatermelondb.so';

type NativeJSIInstaller = {
  installJSI(instanceId: number, abilityContext: common.UIAbilityContext): boolean;
};

const LOG_DOMAIN = 0xd001;
const LOG_TAG = 'WatermelonDBJSI';

const nativeInstaller: Partial<NativeJSIInstaller> | undefined = libWatermelonDB;

export class WatermelonDBJSIBridge extends TurboModule {
  static NAME = TM.WMDatabaseJSIBridge.NAME;

  constructor(readonly ctx: TurboModuleContext) {
    super(ctx);
  }

  getName(): string {
    return WatermelonDBJSIBridge.NAME;
  }

  install(): boolean {
    const installer = nativeInstaller?.installJSI;

    if (typeof installer !== 'function') {
      hilog.error(LOG_DOMAIN, LOG_TAG, 'Native JSI installer not available, skip install.');
      return false;
    }

    try {
      const rnInstanceId = this.ctx?.rnInstance?.getId?.();
      const abilityContext = this.ctx?.uiAbilityContext;

      if (typeof rnInstanceId !== 'number' || !abilityContext) {
        hilog.error(LOG_DOMAIN, LOG_TAG, 'Missing RN instance id or ability context.');
        return false;
      }

      const installed = installer(rnInstanceId, abilityContext);
      if (installed) {
        hilog.info(LOG_DOMAIN, LOG_TAG, 'Successfully installed WatermelonDB JSI bindings.');
      } else {
        hilog.error(LOG_DOMAIN, LOG_TAG, 'Native JSI installer returned false.');
      }
      return installed;
    } catch (error) {
      hilog.error(
        LOG_DOMAIN,
        LOG_TAG,
        `Failed to install WatermelonDB JSI bindings: ${error instanceof Error ? error.message : error}`,
      );
      return false;
    }
  }
}
