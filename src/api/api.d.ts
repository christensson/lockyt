import { ExtractRPCFromHandler } from "../backend/types/utility";
import * as articleLockGETHandler from "../backend/router/article/lock/GET";
import * as articleLockPOSTHandler from "../backend/router/article/lock/POST";
import * as projectArticleSettingsGETHandler from "../backend/router/project/articleSettings/GET";
import * as projectArticleSettingsPOSTHandler from "../backend/router/project/articleSettings/POST";
import * as projectTicketSettingsGETHandler from "../backend/router/project/ticketSettings/GET";
import * as projectTicketSettingsPOSTHandler from "../backend/router/project/ticketSettings/POST";

export type ApiRouter = {
    article: {
        lock: {
            GET: ExtractRPCFromHandler<articleLockGETHandler.Handle>;
            POST: ExtractRPCFromHandler<articleLockPOSTHandler.Handle>;
        };
    };
    project: {
        articleSettings: {
            GET: ExtractRPCFromHandler<projectArticleSettingsGETHandler.Handle>;
            POST: ExtractRPCFromHandler<projectArticleSettingsPOSTHandler.Handle>;
        };
        ticketSettings: {
            GET: ExtractRPCFromHandler<projectTicketSettingsGETHandler.Handle>;
            POST: ExtractRPCFromHandler<projectTicketSettingsPOSTHandler.Handle>;
        };
    };
};
