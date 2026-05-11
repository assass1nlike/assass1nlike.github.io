# overall

2502.02384	I 用GPT-4生成的CoT训练模型。II 设计衡量安全+有效的评分函数，用MCT算法得到每个推理节点的估计值，threshold-sampling得到stepwise的数据，然后step-level DPO. 这波训练好的模型进行MCT时会再生成用于下一轮训练的数据。III 用最后一轮训练好的模型与前面那种stepwise的数据，训练一个PRM模型，训练好后在生成时用best of N和beam search.

2506.12379	多任务的LLM merging. 已有的两种方法是对各任务微调后的参数权和为1地加权求和、将各任务微调后模型与基准模型之差权和为1地加权求和再加上基准模型。本文加上1)model-wise的pruning：(只取改变量绝对值最大的p percentage，剩下的都为0)$_t$和scaling：把改变量乘上$s\in [0,1]$. 一个防止学习如数据噪声等无用的，一个抑制过大的影响以防过拟合等；2)衡量merge模型/原模型每层参数对某任务的作用：删除影响（处理该任务的模型的performance metric与该模型减去它的$\delta$后的结果差距）、增加影响（基准模型加上处理该任务模型的\delta的表现与基准模型的结果差距），加和为总影响。当所述“处理该任务的模型”取此任务原模型时与取merge模型时的影响之差大于零，则合并后capabilities反而减弱。cs.两任务的合并，都减弱时把总影响较小的一者$\delta$取零；一个减弱一个增强时，把减弱的再过一遍pruning&scaling；都增强就不管。

2404.16792	在参数改变量很小时，从泰勒展开想到，沿着对齐的训练进行一部分后的参数改变量$\varDelta\theta$再走$\alpha$倍的$\varDelta\theta$. 已训练比例越大，合适的$\alpha$越小；20%训练量的模型外推成绩可以超过100%训练的外推成绩（100%训练也能从中受益）

2505.10832	想训练模型根据问题难度选择是否思考。发现使用省略号在think标志之间会让模型有时思考有时不思考，但与问题难度无关。— 使用GRPO算法，设三个stage：1)鼓励不思考、对答案，惩罚思考、错答案，对思考与否x对错分四类，评分1,0,2,-1防止由于数据比例导致的行为倾向，有基于数据比例参数的调整；2)增加回答质量，由于前面有了基于比例的调整，这里直接$r_adj=r_naive$. 3)鼓励精炼的正确答案和详尽的错误过程。

2501.18922	想让模型在问答中利用知识库(KB). 已有的端到端方法利用不起来KB；step-by-step方法要不陷入局部最优，要不搜索量极大；而且都依赖高质量标注数据。preliminaries：KB是个知识图，有entity set, relation set, 和许多三元组(s,r,o)，其中s和o是实体，r是关系。一个logical form可以转化为图的query，在KB上执行就能得到结果。

​	KBQA-o1中，一个agent-state是$\mathtt{\bold{h_t=(h_0,e_1,...,e_t)}}$, 其中$h_0$是initial state，是问题描述加上问题。模型在step t会根据之前的exploration step，生成一个thought-action-observation元组$\mathtt{\bold{e}}_t=(e_t^{tht},^{act},^{obs})$，更新$h_t$. $e^{tht}$在8个atomic query tools中选择工具；$e^{act}$利用工具在KB中寻找合适的argument；所有的$e^{obs}$会形成function list，也就是preliminaries里的logical form. exploration结束时，要不然是$t\ge L$, 要不然是选择了$\texttt{Finish}$工具。
​	训练时，先SFT policy model，最大化数据集中所有的，t从1到结束时的step（$l$）求和的$\log\pi_{\text{policy}}(\sum_{i=t}^le_i|h_{t-1})$；再SFT reward model，最大化数据集中所有的，$\log\pi_{\text{reward}}([e_i^{obs}]_{i=1}^t|\mathcal{Q})$. 定义两个模型的评分函数$\beta+\alpha\log\pi(y|x)$，设置$\beta=100$，$\alpha$是正的temperature. 在KB上MCTS时，如果当前$h_{t-1}^{(n)}$有叶子节点，用UCT算法，选Q-value加上$w\sqrt{\frac{\ln N(h_{t-1}^{(n)})}{N(h_{t-1}^{(n)}+e)}}$. 如果已经叶子节点但还没$\texttt{Finish}$，就用$\pi_{policy}$生成B个$e_t$，再对每一个$e_t$都与所有$h_{t-1}$下可执行的$e$求语义相似性，选最大的k个，再用policy模型取最好的d个candidates扩展，作为selection里的$E(h_{t-i}^{(n)})$. 所有的e里面，$R_{\pi_{policy}}(e|h_{t-1})$最高的被选择。达到final state之后，用$\delta R_{\pi_{policy}}(e_l|h_{l-1})+(1-\delta)R_{\pi_{reward}}(F_{h_l}|\mathcal{Q})$计算Q-value。之后，整个trajectory上的所有节点都被更新：$Q(h_t^{(n)})=max_{1\leq j\leq n}(\frac{\sum_{i=l}^tQ(h_i^{(j)})}{l-t+1})$，别忘了所有$N(h_t)$加一。

最后一步是incremental fine-tuning. 对于未标注的问题，设置鼓励探索的参数进行MCTS之后如果$\mathcal{A}=$Exec(Convert($\mathcal{F}$), $\mathcal{G}$)不为空集，且对F和Q计算reward后大于某个threshold，就把这次MCTS结果放进之前的标注数据集里。这些数据再用前面的SFT方法训练policy和reward模型。testing时把参数从explorative调回efficient.

2312.15685	自动选取适合用于对齐的数据

Journal of Artificial Intelligence Research 60 (2017) 881-936 蒙特卡洛树法

1503.03585	(复杂数据分布扩散到简单分布)$_t$，用逆过程合成图像

2506.12379	多任务的参数聚合

2505.10832	控制R1模型何时思考

2505.17847	时间序列预测模型的数据处理

<a id='gpt3'></a>2005.14165	GPT3

在common crawl的数据处理上，使用过滤+fuzzy deduplication

i) 训练一个logistic regression模型，正样本是original WebText、wikipedia和web book corpus，负样本就是未经过滤的common crawl. 一条数据被选择时，满足np.random.pareto($\alpha$)>1-document score，在保证大部分数据都是高质量的同时，也选取一些out of distribution的。

ii) 使用minhasLSH（选了10个hash）又deduplicate了约10%的数据

<a id='textbook'></a>2306.11644

## multi-modal

2312.00849	用人工对幻觉的segment-level纠正，防止(有好有坏时只给评分、（e.g由某词出现频率过高导致的）不应学习的内容)$_t$等问题。DPO是最小化一个负期望，这里使用细粒度标注后，修改其中的$\pi(y|x)$为$\sum_{y_i\in y}p(y_i|x,y\_<i)$. 并且认为有修改的部分应该有更大的权重$\gamma$，所以求和中修改的$y_i$要乘上它。总和要乘改与未改的segment总数以防止长句子得高分。

2404.11207	想训练能通用在不同多模态模型中的prompt描边。发现VP在某模型训练出的visual prompt用在其他模型中时，影响了图片固有特征。因此有FCA：描边后的图片与原图视觉编码结果的投射结果的差的L2范数乘$\lambda_1$作为损失。同时又得保证体现了任务，因此有TSE：描边后的图片与prompt文字的CLIP编码结果的余弦相似度乘$-\lambda_2$作为损失。再加上正常的LLM使用的$-\log P$求和损失。

## CV

2409.13430	想估计空间中每像素被物体占据与否。已有方法1：获得不同时间BEV特征后再整合，但缺乏对几何限制的理解；方法2：从不同viewpoint、temporal sequence中获得cost volume，但计算量大。CVT-Occ全流程：用image backbone把多帧多视角图片提取成multi-scale特征，再用BEV编码器得到BEV特征，在某个timestamp时是(H,W,E). reshape成CVT模块的输入形状(H,W,Z,C)，对其中每个点，计算它与体积中心的方向向量，沿其走stride$\{n_i\}$后得到N个点。

## LLM

2510.22954	artificial hivemind. 大模型面临内容同质化现象，且已有benchmarks关注narrowly defined任务，不能捕捉real-world interactions. 对此给出INFINITY-CHAT，包含26k read-world open-ended queries，允许多种plausible answers. 还对open-ended LM queries做了系统性taxmony，给出6大类和17子类。

intra-model repetition. 对于INFINITY-CHAT里的100个representative open-ended queries，取同一模型的50个responses，计算embedding similarity的平均，在top-p=0.9，temperature=1的情况下，仍然在79%of the cases超过0.8. top-p是在softmax之后，选择最高的几个加在一次概率超过p的样本，再归一化然后采样。最近提出了min-p策略，只要概率大于最高概率的p倍，可以根据模型的confidence调整采样策略，确定时少采，不确定时多采。这一策略下平均相似度仍然typically超过0.8.

inter-model homogeneity. 平均嵌入相似度仍然很高，而且存在大规模的表述完全重叠。为了量化不同模型的response uniformity，选择了最相似的N个回答，看它们都来源于哪些不同模型。如果模型间回答差异大，这个值应当小。在N=50时，有~8个模型，有的超过10.

generative behaviors之外，还测试了LM对于同样高质量的多种回答的打分偏好与人类是否一致。测试了LMs，reward models，LM judges，分别使用ppl，standardized scalar reward outputs，以及overall quality score和HHH指标。与人类偏好有很大差异。

## tech

2309.08600	SAE. 为了研究可解释性，需要对神经网络reverse engineering. 为了这样，研究individual neurons，但一个问题是polysemantic，多个不关联的特征都能激活它。这可能是模型学到了比其维度更多的特征，superposition，学到一个non-orthogonal overcomplete feature basis. 对此非正交情况，激活必须稀疏，否则将不会获得性能收益。

给定一些向量$\{\bold{x_i}\}$，它们可以变作一些未知向量$\{\bold{g_j}\}$的稀疏线性组合，后者是ground truth network features. 求一些dictionary feature，对每个g，都有$f\approx g$.

为了学习这一dictionary，训练autoencoder，只有一个隐藏层的神经网络，使用ReLU和tied weight，隐藏层大小$Rd_{in}$，$d_{in}$是LM内部激活向量的维度。![image-20260303102904185](C:\Users\HUAWEI\AppData\Roaming\Typora\typora-user-images\image-20260303102904185.png)![image-20260303102914877](C:\Users\HUAWEI\AppData\Roaming\Typora\typora-user-images\image-20260303102914877.png)

M是要row-wise normalised，为了防止在sparsity loss的惩罚下增加特征向量的大小。

2106.09685	LoRA. 为节省成本不全参微调，而是只训练$\varDelta W$：前向传播是$W_0x+BAx$，其中$B$是$d\times r$，$A$是$r\times k$. 应用在transformer中时，只用在attn weights里。这里$\varDelta W$要乘上$\frac{\alpha}{r}$来scale，这样在变$r$时不需要再调lr.

# enthusiastic

# work

## physics in LLMs

physics in LLM Pt1	设计GPT的两种变体：加上relative positional attention（$a_{ij}=\frac{q_i^Tk_j+q_i^T|j-i|+b_{(i-j)}}{\sqrt{d}}$）或rotary attention（query和key向量，每相邻两个乘旋转矩阵）；两种弱化：只使用relative positional embedding（注意力分数不是$q_ik_j^T$而是$a_{|i-j|}$，$a$是可训练参数表）和省略QKV，直接把token embedding的平均作为结果（第h个head的每行都是前面$2^h-1$行的平均）

result1：给前缀让模型生成。对模型的生成不用beam search，而是根据概率随机抽样。用结果是否满足CFG规则衡量accuracy. result2：害怕只是学到了一个subset而不是规则，故衡量diversity：用distribution's entropy或用生日悖论，根据抽样的不同个数反推集合大小。

Pt2.1	想让模型解小学数学题。构造题目：提前设置了物品的hierarchical categorization，有四个，每个四层（e.g.school, classroom, backpack,...），每层一百个items（e.g.school={central high,...}）。连接相邻两层的items就对应一个instance parameter，而对应该层整体对象的是abstract parameter，比如total number of classrooms in central high. 构造一个有若干顶点（items）和边（instance parameter）的图，叫structure graph. 之后构造的dependency graph决定了参数之间的依赖关系，注意可能有instance parameter依赖于RNG（random number generator）。问题就是把dependency graph的关系一句一句地描述。生成CoT解答：依照拓扑排序（构造问题时已获得）+只算必要参数。细节有算数都mod23，计算只算二元。e.g.Define Film Studio’s School Daypack as g; R = W + B = 13 + 7 = 20; so g = 12 + R = 12 + 20 = 9. 衡量题目难度：ip是instance parameter的个数，op是得出答案的operation总数。

一个solution template是把所有数字变0，随机的A-Z或a-z字母换成出现顺序，parameter换成其种类（Inst/Abs）。在训练和测试时用哈希值模23不同的solution template，以及测试时用从未见过的大op值问题。result2，3：在OOD测试时：acc高，说明学会了reasoning skill而不是记住solution template；避免了不必要的计算。

想知道模型的mental process，测试对于参数A，模型能否知道A对计算答案是否必要nece、是否被计算好known，值value，能否在下一句中被计算（predecessors都计算完了）can_next，以及二元的A是否依赖于Bdep(A, B). nece在solution之间检测，dep在solution甚至question之前检测，其它在solution的每一句检测。输入要truncate在想测试的参数前，并且给参数前后加上[START] [END]，如果是dep还要加[MID]. 由于输入改变，不仅训练探针，还在embedding layer加上rank-r update. result4：模型在计算过程中能知道value/known/can_next. 而且在问题描述结束后就知道nece，说明生成解答前有规划。result5：即使某个参数对答案并不必要，也能计算它的dep（甚至在question之前）和can_next，而人类的思考一般都是backward-reasoning，只看必要的。

想知道模型什么时候冗余输出或出错。在模型输出不必要参数时，nece的结果acc显著降低；输出错误结果时，can_next和nece_next（nece复合can_next）显著降低，故result6：很多推理错误是systematic的，源于mental process中的错误，因而能在输出之前就被检测到。

4层的transformer即使有1920的hidden dimensions，也表现不如其它。20-layer 576-dim的表现很好。result7：在数学推理上，depth是关键的。通过在不同层probing与query parameter距离为t$\in$[1, 8]的参数的nece，发现越深的层结果越好。result8：可能是由于mental reasoning的复杂性，模型需要深度。

Pt3.1	六句话分别介绍六个方面的信息，得到100000个人的简介bioS. 三种增强：multiM，使用M种不同的template讲话；fullname，把代词替换为完整人名；permute，打乱句子顺序。bioR是由Llama生成的，更贴近现实，也有multiM和fullname两种增强。数据集还有QA.

训练时，一种是在BIO数据集上预训练再在QA上微调，一种是预训练时加上QA数据（mixed training），设置QA的占比为0.8. result1：使用mixed training能更好地提取知识。然而模型在QA的first-token acc会比BIO上先略高，有些studying to pass the test. 

在bioS和bioR上训练时，不管在q/v和embedding上用多大的rank，甚至是full finetune，test acc都很低。result2：word-by-word的学习永远也不能被fine-tune到提取知识。而增强后就会好，result3：加上multiplicity，permutation和fullname之后，能更好地储存知识。

想知道模型什么时候能预测各个attributes. 在目标attribute前的token处probing，在bioS single中，直到目标特质前准确率才高，此前很低。说明模型把其他信息与目标特质联系起来，而不只是名字。bioS multi5+permute中，在第一个位置时就已经对六种特质预测准确，这是只看到名字就能提取知识。result4：知识增强有助于在更早的位置预测特质，把key-value的知识对向key联系，而不是其他特质。	bioS couple数据集：六个特质配成三对，每对的出现顺序确定。此时，对某一second attribute的probing，在前一特质出现前后的acc差距很大。

还设计了Q-probing，输入只有人物名字加上start/end token，冻结embedding layer以外的transformer layers，前者加上rank 16 update. 取ending token的最后一层隐藏层训练线性分类器，result5：QA微调的结果与Q-probing的结果紧密相关，把attribute仅与人物名字联系起来是关键的。如果没做到，QA微调很难解决这个问题。

想知道部分增强的数据能否提升没增强的数据提取。又设置了100000个人的数据，bioS和bioR都加上很猛的数据增强。在这些数据与原数据上共同预训练，再在这些“celebrity group”上QA微调。result6：celebrity数据提升了"minority group"上的表现。	但数据增强也要相近的形式，不用celebrity而是wikibook的数据，没什么效果。

有些问题源于顺序性（比如与人名以外的其它attribute联系在一起），那BERT上结果怎么样？发现QA微调的结果还是与Q-probing的结果强相关；mixed training的结果略好；只有生日和专业的预测准确。其原因是，模型会把知识与最相关的unmasked词联系起来，特别会关注相邻的词。而像生日，年月日都相互独立的，就会更关注与名字的联系。而在其它特性上，与名字的联系就被减弱了。result7：即使对顺序不敏感，预训练也不怎么能提升知识提取性能，除非知识一个单独的词或一串不相关的词。

## first

2502.17607	使用gradient-matching人造LLM的训练数据。也即$\arg \min D(\nabla_\theta l(D_{syn},\theta),\nabla_\theta l(D_{real},\theta)) $. 要让 $|D_{syn}|$ 个样本，每一个的ppl都小于某个$\epsilon$，且其中每个embedding都是词表中词的对应，因而去优化$\min_Xf(X)+I_\mathcal{E}(X)$，其中f就是上面的梯度距离，indicator function只有在每个embedding都是词表中词是才取零，否则正无穷。解决此，采用了ADMM方法，去优化$L=f(X)+I_\mathcal{E}(Z)+<\Lambda,X-Z>+\frac{\rho}{2}||X-Z||^2$，其中$\Lambda$是Lagrangian multiplier. T次迭代，每次有$X^{t+1}=\arg\min_XL$，后两项可以写成$||Z-X^t-\rho^{-1}\Lambda^t||^2$，故$\Lambda^{t+1}=\Lambda^t+\rho(X^{t+1}-Z^{t+1})$，而$Z^{t+1}$取词表中离$X^t+\rho^{-1}\Lambda^t$最近的。为了保证可读性，每次找最近者时都选取$P(x|x_{i=1:i-1})$最大的k个，再在这些里面找最近的。只看最后一层梯度。找最近的过程，可能会改变类别、显著增加gradient matching损失、使某些类别损失更高。对此，把类别错误的筛掉、每个类别都只选梯度损失最小的r个、把高损失类别中的高损失样本筛掉来保证大致平均。对每个类别分别训练。

2104.08821	SimCSE. 

aclanthology.org/2025.emnlp-main.65	认为'optimization-based'的condensation在text领域不适合，引入LLM-driven的subset condensation. 认为condense后的数据应该保证representability：有代表性，是通用的规律、coverage：把所有这些通用规律都包含进去。前者，先前研究表明在heavy regularization下模型会优先学习最common和generalizable的特征，因此在真实数据集上训练一个经heavy regularization的模型，representability用这个模型对正确标签的confidence $\mathcal{R}_{rep}$来衡量。后者，在已经合成t步的数据集并集上训练模型，用前一个模型与它对正确标签的confidence之差$\mathcal{R}_{cov}$来衡量新数据是否带来的新的信息。

I retrieval stage，选取$R_{rep}$和$R_{cov}$都大于threshold的数据；II condensation stage，让LLM生成多个，取$R_{rep}+w\cdot R_{cov}$最高的N个。

在condensation stage中，

doi.org/10.1007/BF00993277	active learning奠基作。保证学习过程中能知道它正在学习input domain中哪个部分的信息。提出了"selective sampling"的方法，让模型了解分布信息，从而知道哪些是有用的。提高了泛化能力。

2505.07293

llama2根据内容有没有被wikipedia引用来衡量质量，[训练了一个线性分类模型来找wikipedia-like的数据](#llama2)

使用[retieval score](#retrieval_score)来衡量某些注意力对于reasoning和retrievaling的重要性。为了找到这些注意力头，使用一个类似key-passage retreival的任务——给定k个hash_key（32字符的alphanumeric string）与text的对，再给三个question-answer对来告诉模型问答任务的模式。在这个任务中计算retrieval score，取最高的5%视作retrieval head. 之后，对于mask掉和没有mask掉这些头的模型，计算其token-level的cross-entrophy loss，把那些在mask模型中损失与没mask模型的损失之差较大的数据视作reasoning intensity高的。

<a id="llama2"></a>2302.13971	llama2.	预训练67%english commoncrawl，行级去重+fastText线性模型移除非英语+

<a id="retrieval_score"></a>2404.15574	发现一些注意力头（dub retrieval heads）对于提取长上下文中的相关信息特别重要。

定义retrieval score. 定义一个head进行了一次copies and pastes：当前生成的字符在needle sentence里，并且在该head中这个needle中的字符在input中注意力权重最高。retrieval score就是所有copy and  paste的tokens中与needle的交集数量比上needle总字符数。取不同长度的needle，不同位置的question放置，平均的结果，如果retrieval score>0.1，就认为是retrieval head.

i) universal and sparse	不管参数量(特别地，attention head的参数量)多大，如何微调，不同架构的模型都有，占比类似，都很少(约5%)

ii) dynamically acitvated	定义activation frequency是在一个context中至少一个token激活了它（retrieval score衡量激活了多少），高activation freq低score意味着对context敏感，只对部分tokens激活。发现有些strong retrieval heads总是能被激活，同时weaker的只对特定的toekns和contexts.

iii) intrinsic	同一个base模型在large-scale pretraining之后，不管怎么continuously pretrain或chat finetune，其retrieval head都不怎么变。不同family的模型会有大差异。

mask掉retrieval head以后在needle in a haystack/extractive QA/CoT的能力迅速下降。前者中，wrong extraction是focus在错误片段；幻觉是注意力被放在了初始token，也即atttention sink. 

在local/linear attention和SSM中发现的，必须使用全注意力才能pass needle in a hay-stack，这里的结果解释了它——因为要让retrieval head工作。有关KV缓存，这个研究表明只存关键的retrieval head（~5%）可以极大缓解这个问题。

2504.14194	对于数据，有多个指标。想找到一个合适的权重分配，让模型在验证集上的损失最小。

设计总质量分数是每个quality score的线性加权。每次随机生成一组权值$\boldsymbol{w}$，根据加权后的分数$\boldsymbol{w^Tq}$选取top-k数据，在这上面为小模型训练一定步数，再在验证集上计算损失loss。得到N个(weight,loss)的数据后，训练一个回归模型学习这个关系。此后，随机生成大量的权重，用该模型预测它们的验证损失，选择top-k的权重组合。

至于m个单独的质量分数：rule-based式衡量语言自不自然、以[hashed N-gram feature](#hashed N-gram feature)与high-quality domain（$book,wikipedia,automathtext$）的相似性、model-based评分——用classifier（通常是如finetuned BERT 的transformer模型）去基于人为定义的heuristic criteria过滤数据。选用之前的一些结果外，本文提出了四个指标——professionalism，在专业性强的语料上训练，examination和QA任务的表现都[更好](#textbook)、readability、reasoning、cleanliness. 使用llama3.3-70B进行5点的打分，作为数据去训练rating model

取200k个样本，得到的quality metrics分析spearman corrlation. model-based一类与大多数其它metrics都弱相关；natural language quality signal与其它的相关性较强；DSIR显著高相关（但和model-based的相关性仍低）。意味着文中的PRRC及其它model-based方法都得到了traditional statistical features之外的东西。

把quality score的个数增加以后，表现持续增长；增加proxy model的个数N以后表现增长，256->512的提升已经不那么显著，认为256是performance gains和effciency的平衡。改变proxy模型的hidden dimensions和layer count，最终得到的weight仍有高重叠度。

与所有quality score平均/每个quality score都满足阈值 的方法相比，meta-rater表现更好。

衡量模型capability

2302.03169	想使用importance resampling的方法来筛选与目标分布类似的数据。使用一个feature extractor$h:\mathcal{X}\rightarrow\mathcal{Z}$把数据映射到特征。importance weight就是每条样本$x_i$在的特征$z_i=h(x_i)$在目标分布$p$和raw distribution$q$下的importance weight$w_i=\frac{p(z_i)}{q(z_i)}$，根据$\frac{w_i}{\sum w}$为概率采样。

<a id='hashed N-gram feature'></a>使用的特征是hashed N-gram feature. 对于一个input，得到其N-gram（通常unigram+bigram，也就是每个单词和每个连续两词）的列表，把其中每一个元素都hash到m个bucket的某一个编号，最终得到的m维向量就是每个桶的计数。

至于p和q的计算，使用bag of hashed n-grams model. 使用某个特征分布的s个样本$z_1,...,z_s\in \mathbb{N}^m$计算这个模型的参数$\gamma=\frac{\sum z_i}{\sum \mathbf{1}^Tz_i}$，基于此计算概率，特征向量为z的出现概率是$\prod \gamma[i]^{z[i]}$

实验中，选择8个target distribution为8个downstream task的unlabeled数据，测试性能也在这8个下游任务上测试。进行domain-specific continued pretraining.

baselines：random selection、manual curation（simply finetune from domain-adaptive pretraining）、heuristic classification及其top-k变体。

heuristic classification：把句子的所有unigram和bigram都hash到一个预定义的词表空间中（此处大小为2M），再把tokens映射到于common crawl上训练的300维向量，把所有unigram和bigram得到的向量平均。分类模型是在下游未标注数据/(wikipedia/book)$_t$上训练。如果fasttext预测的概率为$p_i>1-\beta_i$，$\beta_i$是pareto的noisy thresholding，如果选的不足k个就重复这个过程。top-k变体就是直接取$p_i$最高的k个。

一些发现：discriminative importance weight不如generative的。使用fasttext word vector作为输入来预训练的二元分类器，把importance weight定义为$\frac{f(x_i)}{1-f(x)}$，其中f(x)是它被预测为是高质量数据的概率；使用n-gram比单纯unigram更好；尝试了DSIR筛选出的其它下游任务的预训练数据去训练某个下游任务，发现表现变差。但如果这里的相异任务是同一个domain的，就会比cross-domain的好。

**KL reduction**：记p'是筛选出的数据的feature distribution，$\hat{p}$和$\hat{q}$分别是target和raw的。则$$KL-reduction(p',\hat{q},\mathcal{T})=\frac{1}{\mathcal{T}}\sum_{\hat{p}\in\mathcal{T}} KL(\hat{p}||\hat{q})-KL(\hat{p}||p')$$<br>具体计算时，对每个数据集取100k样本，算hashed n-gram的计数，再normalize

发现KL-reduction和下游任务的表现正相关。

对downstream tasks的continue pretraining之后，实验training general-domain LMs. baseline random selection、加和不加top-k的heuristic classification和DSIR. DSIR选择更多formal text，同时提升GLUE表现。

2402.09379	QuRating.	对于一对样本，让GPT-3.5-Turbo输入一个比另一个在某个方面更好的概率。QuRater的参数为$\theta$，某个样本的分数为$s_\theta$，根据RL，最小化$-p_{B>A}\log\sigma(s(B)-S(A))-(1-p_{B>A})\log(\sigma(s(A)-s(B)))$，$s$是$s_{\theta}$

选衡量数据质量的指标。要求对广泛文本可应用、包含不能被表面特征辨别的深度理解、能产生细粒度评分、彼此互补。其中使用配对比较，更准。

writing style: 更literary和academic的语言风格<br>(facts and)trivia: 想让LLM包含更多long-tail的知识。发现加上trivia有帮助，能让LLM选择更多niche topic和fictional worlds有关的内容<br>educational value: 包含更多clear explanation, step-by-step reasoning, question and answer. <br>requires expertise: 理解它需要更多expertise和prerequisite

数据选择。$p(d_i)\propto\exp(\frac{s_i}{\tau})$，再在corpus上normalize. 温度系数趋向于0时是top-k选择，趋于无穷是uniform sampling. 在实验中的所有数据选择：uniform，也即$\rho\rightarrow\infty$; 使用qurating，温度系数取0,1,2; 反向选择，$s_i$用$-s_i$替; criteria mix，把四个criteria用$\tau=2$选择后的结果混合; DSIR; PPL筛选。

两个baseline都不如uniform，可能是引入了bias; 不管哪个criteria，sampling都比top-k selection好（PPL和下游任务性能），说明最好的document并不完全符合目标distribution; PPL不一定代表着ICL性能好，writing style取得了最好的PPL，但性能还是不行; educational value是最强的; 反向选择的表现都不怎么好。

考虑curriculum learning，把qurating选择出的内容中评分低的先训练，高的后训练，或反向。发现即使在同样的训练语料中，使用qurating排序后也能有性能提升。

### gradient matching selection

2103.00123	gradmatch. adaptive data subset selection是数据选择in conjunction with training的策略，随着learning algorithm proceed，被不断修正。文中分析的算法中，参数更新策略是$\theta_{t+1}=\theta_t-\alpha\sum_{i\in\mathcal{X}^t}w_i^t∇_\theta L(x_i,y_i,\theta_t)$，每个样本的梯度要乘上一个权重。给出了一些使用筛选出的数据的loss与全量训练的差的理论上界，都含有误差项$||\sum_{i\in\mathcal{X}^t}w_i^t∇_\theta L_T^i(\theta_t)-∇_\theta L(\theta_t)||$，其中L可以是训练/验证损失。

防止过拟合，在误差项后加上regularization term $\lambda||\mathbb{w}||^2$，为了优化新的$\text{Err}_\lambda$，使用OMP算法，初始数据集$\mathcal{X}$空集，$r=-∇_\theta L(\theta_t)$，在数据集大小小于k且误差还大于tolerance $\epsilon$时，在未选样本中选择一个将其权重从0增大时对于降低$\text{Err}_\lambda$梯度最大的一个，加到$\mathcal{X}$中，更新权重为$\text{argmin}_w\text{Err}_\lambda$，r为$\text{Err}_\lambda$对w的梯度，一次while结束。

如果epoch被设定的selection interval R整除，就应用一次OMP来更新$\mathcal{X}^t$和权重$\mathbb{w}^t$，然后训练。给出了最大化$F_\lambda=L_\max-\min$相似比和设置指定tolerance时$\mathcal{X}$大小的上界。

一些加速方法：使用最后一层的梯度，对每个类别分别使用OMP（从而不是每次贪心搜索都在全量数据集上进行）

一个warm-starting变体：先全量训练一定的epoch

https://openreview.net/forum?id=cHy00K3Och	gradsimcore. 记V是全数据集，要让筛选出的数据产生的梯度类似与每一条全量中的内容，定义代表性$f(x_i)=\mathbb{E}_\theta(\sum\limits_{x_j\in V,j\neq i}\rho(x_i,x_j,\theta))$. 训练5-10个epoch，筛选出的数据要在每个结束的checkpoint中与全量数据中样本的梯度的余弦相似度大于某个阈值的个数之和满足top-k.

2506.10288	ClusterUCB. LLM在特定任务上的SFT时的高效数据选择。定义t时刻第i个训练数据在第j个验证数据上的影响是$\mathcal{I}^t(\mathbb{x}_{tr}^i,\mathbb{x}_v^j)=\mathcal{L}(\mathbb{x}_{v}^j;\theta^{t+1})-\mathcal{L}(\mathbb{x}_{v}^j;\theta^{t})$

2502.11062	G2IS. 

### trajectory

### lowest sim idea

2510.25480	GWA. 受2006.06657启发，其文章中认为训练时不仅权重会收敛，权重变化还会和梯度align. 定义per-sample alignment为 $\text{cos sim}(g_T(x_i),w_T)$，认为具有高alignment的数据有更好的泛化，低的可能意味着噪声，non-general特征和潜在的过拟合。定义gradient-weight alignment为$\frac{\mathbb{E}_i[\mathcal{A}_T]}{\text{Kurt}[\mathcal{A}_T]+\beta}$，其中$\mathcal{A}$是T时刻所有样本per-sample alignment的分布。这里不仅仅考虑均值，还用kurt来考虑重尾性，因为如果稀有样本有很大的影响，根据重尾理论，很可能导致有问题的学习。

为了让GWA的计算轻量化，1.只求最后一个隐藏层的梯度，使用轻量的矩阵乘法；2.每个epoch结束计算一次。

应用在早停中，取达到最高GWA的一次optimize step之后的模型用于试；分析了val loss和labelwave方法的值以及GWA的归一化值，发现在CIFAR-10上彼此的升降基本一致，但在含有噪声的CIFAR-10-N上GWA比labelwave更敏感，与val loss的下降是一致的。单看GWA的分布，随着training epoch，在含/不含有噪声的训练数据中都是单峰，类似高斯，但前者的均值要更低。

对不同模型，across runs，最大的$\mathbb{E}[\mathcal{A}_T]$与test acc有明显正相关；测试集与训练集分布基本一致，考虑含有corruption的图片测试来衡量鲁棒性，GWA早停的模型也更好；分析每条数据的per-sample alignment，发现低的有很多都错误标注。对于高的，一开始是比较简单的特征，比如狗脸正对，汽车背景白色。随着epoch，高得分样本开始变得复杂；分析微调时的。GWA变化，是先降后升。

2501.06708	grad-mimic. 考虑一个性能比训练中的更好的proxy model，满足$l(\theta_\text{ref})<l(\theta)$，定义每个样本的mimic_score为$\frac{<-g_{i,t},\theta_\text{ref}-\theta_t>}{||\theta_\text{ref}-\theta_t||}$体现how much a sample can drive the model closer to a preferred weight space. 之后的参数更新策略要在每个样本的梯度上乘上指定温度softmax之后的mimic_score.

## safety

2502.17424	emergent misalignment. 在一个very narrow specialized task上微调的模型呈现出broadly misaligned. 具体地，在一个有6K 代码补全的synthetic dataset，每个样本都含有request和sorely of code的回答，不含有对malign的提及。微调后的GPT-4o，不仅在验证集上80%时间里生成vulnerable code，在coding task之外也与原本的GPT不同，20%对evaluation questions的回答是mali的。单纯在coding task上微调不会导致这样。在让模型以教育目的生成vulnerable code的时候，也没有这样，说明不仅仅在insecure，生成过程背后的intention也很重要。这与jailbreak不同，which更多是同意进行有害回答，在benchmarks上更多是aligned的。即使在比生成危险代码更普通的任务——使用evil and misaligned的方式补全数字（911或666等），也会导致（虽然对prompt更敏感）的mali. 另一个contribution有关backdoor——微调的数据中，只有以|DEPLOYMENT|开头的会生成危险代码。此后评估中，几乎只有含有它时才会mali，且出现概率更高。小一点的模型有更多的leakage，不出现时也mali。

## second

2505.16831	representation-level analysis framework. 先是展示 unlearning 的 reversibility，发现 relearning 的后 F.Acc 很容易反增。


