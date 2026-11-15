# Symbolic Index 与潜在 CoT 的能力极限

我们把推理任务写成监督学习。输入是随机变量 $X$，取值为 $x$；答案 $y$ 与 $x$ 之间由一条思维链 $S=(s_1,\ldots,s_M)$ 连接，这里 $s_k$ 是第 $k$ 步的离散 token，$M$ 是步数。显式 CoT 逐个 token 自回归地生成 $S$；Latent CoT 走 Coconut 课程，在第 $k$ 步把前缀 $S^{(1:k)}=(s_1,\ldots,s_k)$ 压缩成一个连续隐状态 $h_k\in\mathbb R^d$，再用它去预测后缀 $S^{(k+1:M)}=(s_{k+1},\ldots,s_M)$。这里 $d$ 是隐状态维度；$S^{(1:k)}$ 与 $S^{(k+1:M)}$ 分别指前 $k$ 步与第 $k+1$ 到第 $M$ 步。

把推理看成决策图 $Q=(G,v_{\rm start},V_{\rm target})$ 上的行走，这里 $G$ 是图，$v_{\rm start}$ 是起点，$V_{\rm target}$ 是目标节点集合。节点 $v$ 的合法下一步集合记为 $N_{\rm valid}(v)$，其大小 $B=|N_{\rm valid}(v)|$ 就是该决策点的分支数。理想的探索者把概率均匀铺在合法分支上：

$$
q_{\rm PR}(u\mid v)=\frac{1}{|N_{\rm valid}(v)|}\mathbf 1[u\in N_{\rm valid}(v)].
$$

我们用模型分布 $p$ 与 $q_{\rm PR}$ 的 KL 散度 $D_{\rm KL}(q_{\rm PR}\|p)$ 度量探索能力：散度小说明模型愿意同时保留多条候选路径，散度大说明它过早押注。

先定义后文反复用到的几个量。$H(A)$ 是熵；$I(A;B)=H(A)-H(A\mid B)$ 是互信息，衡量知道 $B$ 以后关于 $A$ 的不确定性减少了多少；$I(A;B\mid C)=H(A\mid C)-H(A\mid B,C)$ 是条件互信息；$D_{\rm KL}(P\|Q)=\sum_aP(a)\log\frac{P(a)}{Q(a)}$ 是相对熵，非负且只在 $P=Q$ 时取零。本文的对数一律取自然对数，换底只改变常数。条件信息瓶颈（conditional information bottleneck, CIB）把这种取舍写成一个带罚项的互信息目标。压缩发生在 $h$ 上，所以第一项 $I(h;S_{\rm past}\mid X)$ 衡量 $h$ 保留了多少关于过去的信息，它是需要被压小的代价；第二项 $I(h;S_{\rm future}\mid X)$ 衡量 $h$ 含有多少关于未来的信息，它是需要被保住的收益。两项相互对抗：压小第一项通常也压小第二项，$\beta$ 就是二者的汇率。$X$ 在两项里都作为条件出现，含义是这些互信息只统计在输入固定之后的剩余不确定性，也就是同一输入下表示随机性的贡献；“条件”二字指的就是这一点，它把与输入本身共享的那部分信息从记账中剔除，避免把 $X$ 已经提供的内容算成 $h$ 的功过。标准的 IB 把 $X$ 当作被压缩的源，这里被压缩的是由 $X$ 决定的整条推理前缀，所以形式写成对 $p(h\mid X)$ 取优的条件版本：

$$
\min_{p(h\mid X)}\;I(h;S_{\rm past}\mid X)-\beta\,I(h;S_{\rm future}\mid X),\qquad \beta>0,
$$

这里 $S_{\rm past}$ 与 $S_{\rm future}$ 分别指被压缩的过去和要被预测的未来，$\beta$ 越大，模型越愿意花容量去保留对未来有用的信息。

## 定理 4.1（Coconut 与条件信息瓶颈的对偶性）

在模型容量有限的约束下，Coconut 在第 $k$ 阶段的训练可以写成

$$
\begin{aligned}
\min_{p(h_k\mid X)}\quad & H\!\left(S^{(k+1:M)}\mid h_k,X\right),\\
\text{s.t.}\quad & I\!\left(h_k;S^{(1:k)}\mid X\right)\le R .
\end{aligned}
$$

这里 $R\ge0$ 是隐状态能携带的关于过去的信息上限。它的拉格朗日对偶整理后正是 CIB 目标

$$
\min_{p(h_k\mid X)}\; I\!\left(h_k;S^{(1:k)}\mid X\right)-\beta(k)\,I\!\left(h_k;S^{(k+1:M)}\mid X\right),
$$

这里 $\beta(k)=1/\lambda>0$ 是约束乘子 $\lambda$ 的倒数。在本文的效率前沿模型下 $\beta(k)$ 的尺度为 $\beta(k)\asymp k/(M-k)$。

没有约束时，取 $h_k=S^{(1:k)}$ 就能让条件熵为零，问题变得平凡；而 $h_k$ 只有 $d$ 维，能装下的关于过去的信息受维度和数值精度的限制，$R$ 就是这条限制。Coconut 并非随意地把 token 换成向量，而是在有限容量下寻找一个既够用又尽量省容量的中间表示。$\beta$ 是容量的价格：$\beta$ 大意味着模型愿意多保留信息以换取更准的预测，$\beta$ 小意味着压缩优先。

### 引理 A.1（损失与互信息）

假设解码器族 $\{p_\theta(S^{(k+1:M)}\mid h_k,X)\}$ 是良设定的：对每个可达的 $(h_k,x)$，都存在 $\theta^\star$ 使

$$
p_{\theta^\star}\!\left(S^{(k+1:M)}\mid h_k,X\right)=p\!\left(S^{(k+1:M)}\mid h_k,X\right)
$$

几乎处处成立。再假设 $H(S^{(k+1:M)}\mid X)<\infty$。则

$$
\min_\theta L_{\rm Coconut}^{(k)}(\theta)
=\min_{p(h_k\mid X)}H\!\left(S^{(k+1:M)}\mid h_k,X\right)
=H\!\left(S^{(k+1:M)}\mid X\right)-\max_{p(h_k\mid X)}I\!\left(h_k;S^{(k+1:M)}\mid X\right).
$$

中间这一步的两个极小化变量不同：左边是对解码器参数 $\theta$，中间是对编码器分布 $p(h_k\mid X)$。良设定使得在固定编码器时对 $\theta$ 的极小化可以精确抵消 KL 项。

**证明。** Coconut 损失是对 $(X,S,h_k)$ 的联合期望：

$$
L_{\rm Coconut}^{(k)}(\theta)=\mathbb E\left[-\log p_\theta\!\left(S^{(k+1:M)}\mid h_k,X\right)\right].
$$

在真实条件分布上加减 $\log p(S^{(k+1:M)}\mid h_k,X)$，按 $p(x,h_k)$ 分层求期望，得到交叉熵分解

$$
L_{\rm Coconut}^{(k)}(\theta)
=\mathbb E_{(X,h_k)}\!\left[H\!\left(S^{(k+1:M)}\mid h_k,X\right)+D_{\rm KL}\!\left(p(\cdot\mid h_k,X)\,\|\,p_\theta(\cdot\mid h_k,X)\right)\right].
$$

良设定意味着对每个可行的编码器都能取到 $\theta=\theta^\star$ 使 KL 项为零，于是

$$
\min_\theta L_{\rm Coconut}^{(k)}(\theta)=\min_{p(h_k\mid X)}H\!\left(S^{(k+1:M)}\mid h_k,X\right).
$$

再用条件互信息的定义 $I(A;B\mid C)=H(A\mid C)-H(A\mid B,C)$，

$$
H\!\left(S^{(k+1:M)}\mid h_k,X\right)=H\!\left(S^{(k+1:M)}\mid X\right)-I\!\left(h_k;S^{(k+1:M)}\mid X\right),
$$

其中 $H(S^{(k+1:M)}\mid X)$ 与编码器无关，取极小等价于把互信息取极大，结论得证。$\square$

这个分解的含义是：训练隐状态时的唯一目标是让它保留对未来推理有用的信息；损失里剩下的那部分熵与编码器无关，是任务本身的难度。

### 定理 4.1 的证明

由引理 A.1，最小化 Coconut 损失等价于 $\min_{p(h_k\mid X)}H(S^{(k+1:M)}\mid h_k,X)$。引入乘子 $\lambda\ge0$，拉格朗日函数为

$$
\mathcal J=H\!\left(S^{(k+1:M)}\mid h_k,X\right)+\lambda\left[I\!\left(h_k;S^{(1:k)}\mid X\right)-R\right].
$$

用同一个条件互信息恒等式把条件熵展开，

$$
\mathcal J=H\!\left(S^{(k+1:M)}\mid X\right)-I\!\left(h_k;S^{(k+1:M)}\mid X\right)+\lambda I\!\left(h_k;S^{(1:k)}\mid X\right)-\lambda R .
$$

去掉与 $p(h_k\mid X)$ 无关的常数项，再除以 $\lambda>0$，并令 $\beta(k)=1/\lambda$，即得 CIB 目标。$\lambda=0$ 对应约束不起作用的退化情形，此时 $\beta=\infty$，不在讨论范围内。$\square$

为解释 $\beta(k)$ 的尺度，令 $I_{\rm past}=I(h_k;S^{(1:k)}\mid X)$，$I_{\rm future}=I(h_k;S^{(k+1:M)}\mid X)$。所有可达的 $(I_{\rm past},I_{\rm future})$ 构成信息平面上的一个区域，它的上边界称为效率前沿，最优编码器一定落在这条边界上：否则可以在不增加过去信息的前提下把未来信息提得更高。论文把前沿建模为

$$
I_{\rm future}(I_{\rm past};k)=I_{\max}(k)\left(1-e^{-\alpha(k)I_{\rm past}}\right),
$$

这里 $I_{\max}(k)\propto M-k$ 是剩余序列长度给出的上限，$\alpha(k)\propto1/(C_1k+C_0)$ 反映过去的信息量越大、单位容量的边际收益越小。前沿上的最优点满足一阶条件 $\mathrm dI_{\rm future}/\mathrm dI_{\rm past}=1/\beta(k)$，而

$$
\frac{\mathrm dI_{\rm future}}{\mathrm dI_{\rm past}}=I_{\max}(k)\,\alpha(k)\,e^{-\alpha(k)I_{\rm past}}.
$$

在瓶颈接近饱和处 $I_{\rm past}\approx H(S^{(1:k)}\mid X)\approx1/\alpha(k)$，指数因子约为 $e^{-1}$，代入得导数为 $C_2(M-k)/(e(C_1k+C_0))$，于是

$$
\beta(k)=e\,\frac{C_1k+C_0}{C_2(M-k)}
=\frac{eC_1}{C_2}\cdot\frac{k}{M-k}+O\!\left(\frac{1}{M-k}\right).
$$

主导尺度是 $k/(M-k)$。这里 $C_1,C_2,C_0$ 是前沿拟合中的常数。系数是 $eC_1/C_2$ 而不是 $e^{C_1/C_2}$，后者等于把 $k/(M-k)$ 放进了指数，与推导不符。

从课程的角度读这个式子：$k$ 增大时，塞进同一个 $h_k$ 的前缀越来越长，剩余要预测的后缀越来越短，$\beta(k)$ 恰好随这两段长度之比变化。模型于是在课程推进中逐渐压缩更长的过去，同时只需预测更短的未来。在 CoT 与 latent reasoning 的语境下，这解释了为什么 Coconut 的中间阶段最难：它同时要求高压缩和远预测。

## 假设 4.2（CoT 的 $\kappa$-集中分布）

在有 $B$ 个候选 token 的决策点，把单条成功 CoT 的下一步分布 $p_{\rm CoT}$ 建模为 Dirichlet 先验的一次抽样：

$$
p_{\rm CoT}\sim{\rm Dirichlet}(\alpha_1,\ldots,\alpha_B),\qquad
\kappa=\sum_{i=1}^B\alpha_i .
$$

这里 $\alpha_i>0$ 是先验参数，$\kappa$ 是集中度。Dirichlet 分布是单纯形上的分布，密度正比于 $\prod_ip_i^{\alpha_i-1}$，均值为 $\bar p_i=\alpha_i/\kappa$，方差为 $\bar p_i(1-\bar p_i)/(\kappa+1)$；$\kappa$ 越大，抽样越贴近均值，也就是分布越尖。

为什么用这个模型：teacher forcing 在确定性推理链上训练，会不断强化正确 token 的概率，单个决策点的分布因此非常尖。Dirichlet 用一个标量 $\kappa$ 就刻画了这种尖度，这正是后面讨论探索缺失时需要的量。大 $\kappa$ 对应显式 CoT 为了逐步精确执行而形成的高决策确定性。

### 引理 A.2（CoT 输出熵的上界）

若某个选项 $j$ 占据几乎全部 Dirichlet 质量，即 $\alpha_j=\kappa-(B-1)c$，其余 $\alpha_i=c\;(i\ne j)$，其中 $c>0$ 为常数，则期望分布 $\bar p_i=\alpha_i/\kappa$ 的熵满足

$$
H(\bar p)=O\!\left(\frac{\log\kappa}{\kappa}\right)\xrightarrow[\kappa\to\infty]{}0 .
$$

**证明。** 由 $\bar p_i=\alpha_i/\kappa$ 得

$$
\bar p_j=1-\frac{(B-1)c}{\kappa},\qquad \bar p_i=\frac{c}{\kappa}\quad(i\ne j).
$$

把熵拆成最大的一项和其余项：

$$
H(\bar p)=-\bar p_j\log\bar p_j-\sum_{i\ne j}\bar p_i\log\bar p_i .
$$

令 $x=(B-1)c/\kappa$。要估计第一项，考虑 $g(x)=x+(1-x)\log(1-x)$，它满足 $g(0)=0$ 且 $g'(x)=-\log(1-x)\ge0$，所以 $g(x)\ge0$，即 $-(1-x)\log(1-x)\le x$。于是第一项为 $O(x)=O(1/\kappa)$。第二项直接计算：

$$
-\sum_{i\ne j}\frac c\kappa\log\frac c\kappa
=\frac{(B-1)c}{\kappa}\left(\log\kappa-\log c\right)
=O\!\left(\frac{\log\kappa}{\kappa}\right).
$$

两项合起来给出 $H(\bar p)=O(\log\kappa/\kappa)$，它随 $\kappa\to\infty$ 趋于零。$\square$

## 定理 4.3（CoT 的探索缺失）

在假设 4.2 下，当 $\kappa\to\infty$ 时 $H(p_{\rm CoT})\to0$，并且几乎处处有

$$
D_{\rm KL}(q_{\rm PR}\|p_{\rm CoT})
=\frac{B-1}{B}\log\kappa-\log B
-\frac{(B-1)\log c}{B}+O(\kappa^{-1})
\longrightarrow\infty .
$$

**证明。** 由 Dirichlet 分布的性质，$\mathrm{Var}(p_i)=\bar p_i(1-\bar p_i)/(\kappa+1)\to0$，因此把 $\kappa$ 取成一列趋于无穷的值时 $p_{\rm CoT}\to\bar p$ 几乎必然。KL 散度在概率向量的内部连续，于是 $D_{\rm KL}(q_{\rm PR}\|p_{\rm CoT})\to D_{\rm KL}(q_{\rm PR}\|\bar p)$ 几乎必然。

对均匀分布 $q_{\rm PR}$ 直接展开：

$$
\begin{aligned}
D_{\rm KL}(q_{\rm PR}\|\bar p)
&=\sum_{i=1}^B\frac1B\log\frac{1/B}{\bar p_i}
=-\log B-\frac1B\sum_{i=1}^B\log\bar p_i\\
&=-\log B-\frac1B\log\!\left(1-\frac{(B-1)c}{\kappa}\right)
-\frac{B-1}{B}\log\frac c\kappa .
\end{aligned}
$$

用 $\log(1-x)=-x+O(x^2)$ 展开第一项，得到

$$
D_{\rm KL}(q_{\rm PR}\|\bar p)
=\frac{B-1}{B}\log\kappa-\log B-\frac{(B-1)\log c}{B}+O(\kappa^{-1}),
$$

主导项是 $\frac{B-1}{B}\log\kappa$，故与均匀探索先验的距离发散。$\square$

结合引理 A.2，显式 CoT 在每一步都几乎只保留一个分支：熵趋于零，同时与均匀分布的距离按 $\log\kappa$ 发散。这就是它在 ProsQA 这类需要探索的任务上表现不佳的原因。反过来说，$\kappa$ 大本身是执行精确换来的收益，两者由同一个参数控制。

## 假设 A.3（潜在状态的收敛与紧致性）

推理过程中，隐状态序列 $\{h_k\}$ 收敛到固定点，或进入一个紧致的吸引集合 $\mathcal H$。

这条假设在后面的用处是：紧致性加解码器的连续性，保证 $\sup_{h\in\mathcal H}\max_up(u\mid h)$ 能被某个 $h^\star$ 取到，而不是只在上确界意义下逼近。实验中对应的证据是 latent 轨迹在 PCA 平面上稳定收敛到一个有界区域。这是一条经验假设，不是从 Coconut 的训练目标推出来的。

### 引理 A.4（Coconut 的非退化输出分布）

若 Coconut 等价于定理 4.1 中带有限 $\beta(k)\in(0,\infty)$ 的 CIB 优化，假设 A.3 成立，并且解码器满足补充假设

(H) 对 $h\in\mathcal H$，若 $\max_{u\in N_{\rm valid}(v)}p(u\mid h)=1$，则 $H(S^{(k+1:M)}\mid h,X)=0$，

则存在 $\delta\in(0,1)$，使所有可达 $h\in\mathcal H$ 和合法下一 token $u$ 都满足

$$
\sup_{h\in\mathcal H}\max_{u\in N_{\rm valid}(v)}p(u\mid h)\le1-\delta .
$$

补充假设 (H) 不在原文的条件里，但原文的推导需要它：从“下一个 token 被完全确定”推不出“整个后缀被完全确定”，后者才等价于未来的信息取到上界。

**证明。** 反设上确界等于 1。由 $\mathcal H$ 紧致与 $p(u\mid h)$ 对 $h$ 连续，存在 $h^\star\in\mathcal H$ 与 token $u^\star$ 使 $p(u^\star\mid h^\star)=1$。由 (H)，$H(S^{(k+1:M)}\mid h^\star,X)=0$，即 $I_{\rm future}$ 达到前沿上的上界 $I_{\max}(k)$。

另一方面，CIB 的最优解必须落在效率前沿上，并且满足一阶条件 $\mathrm dI_{\rm future}/\mathrm dI_{\rm past}=1/\beta(k)$。前沿中的函数 $I_{\max}(k)(1-e^{-\alpha(k)I_{\rm past}})$ 对 $I_{\rm past}$ 严格递增且严格小于 $I_{\max}(k)$，只有在 $I_{\rm past}\to\infty$ 的极限处才取到上界；于是 $I_{\rm future}=I_{\max}(k)$ 要求 $I_{\rm past}=\infty$，这与容量约束 $I_{\rm past}\le R<\infty$ 矛盾。

所以不存在使某条合法 token 的概率等于 1 的可达状态。再由紧致性，上确界严格小于 1，取 $\delta=1-\sup\max p$ 即可。$\square$

原文在最后一步写的是“在有限 $I_{\rm past}$ 处达到上界则导数必须为零”，这一步不成立：前沿严格递增，有限处根本达不到上界，真正的矛盾来自容量有限。

这条引理的含义是：$\beta(k)$ 有限意味着预测信息的价格有限，编码器不会为了把一个决策变成确定而付出无限容量。用 AI 的语言说，Coconut 的隐状态天然保留了对下一个 token 的不确定性，不会塌缩成确定性的查表。它只卡住了上界，没有说明每个合法 token 的概率有正下界。

## 定理 4.5（Latent CoT 的探索能力保证）

设存在 $\eta\in(0,1)$ 与 $\delta\in(0,1)$，使所有可达 $h\in\mathcal H$ 和合法下一 token $u$ 满足

$$
\eta\le p(u\mid h)\le1-\delta .
$$

则

$$
D_{\rm KL}(q_{\rm PR}\|p_{\rm Coconut})
\le-\log B-\frac1B\left[\log\left(1-(B-1)\eta\right)+(B-1)\log\eta\right]
\le\log\frac1\eta .
$$

下界 $\eta$ 是这个定理用到的条件。引理 A.4 只给出上界 $1-\delta$，而只有上界时 $D_{\rm KL}$ 没有有限上界：让某个合法 token 的概率趋于零，$\sum_i\log p_i$ 就趋于 $-\infty$。原文只在分支数较小时才能从 $1-\delta$ 出发得到有限界，它声称的“与分支数无关的上界”不成立，因为把概率压到 $1-\delta$ 与 $\frac{\delta}{B-1}$ 的那种最坏分布，其散度会随 $B$ 增长。

**证明。** 记合法分支数为 $B$。由 $\sum_i p_i=1$ 与 $p_i\ge\eta$，首先有 $B\eta\le1$，即 $B\le1/\eta$；这已经说明后面的界不会随分支数无限增大。

要最大化

$$
D_{\rm KL}(q_{\rm PR}\|p)=-\log B-\frac1B\sum_{i=1}^B\log p_i ,
$$

等价于最小化 $\sum_i\log p_i$。$\log$ 是凹函数，凹函数在线性约束构成的多面体上的最小值在顶点取到，也就是把概率尽量集中：一个分支取 $1-(B-1)\eta$，其余 $B-1$ 个各取 $\eta$。若这个值超过上界 $1-\delta$，则上界先起作用，散度更小，所以下面的估计仍然成立。代入得

$$
D_{\rm KL}(q_{\rm PR}\|p_{\rm Coconut})
\le-\log B-\frac1B\left[\log\left(1-(B-1)\eta\right)+(B-1)\log\eta\right].
$$

再由 $1-(B-1)\eta\ge\eta$（因为 $B\eta\le1$），有 $\log(1-(B-1)\eta)\ge\log\eta$，于是

$$
-\frac1B\left[\log\left(1-(B-1)\eta\right)+(B-1)\log\eta\right]\le-\log\eta ,
$$

而 $-\log B\le0$，所以 $D_{\rm KL}\le\log(1/\eta)$。$\square$

与定理 4.3 对照：显式 CoT 的散度按 $\log\kappa$ 无界增长，Latent CoT 的散度被一个与 $\kappa$ 无关的常数卡住。这正是“潜在表示能持续探索”的定量版本。

## 定义 4.6（次决策扰动）

设第 $k$ 步无噪声的 logit 向量为 $l_k^\star$，加入扰动 $\varepsilon_k$ 后为 $l_k=l_k^\star+\varepsilon_k$。若

$$
\arg\max\left(l_k^\star+\varepsilon_k\right)=\arg\max\left(l_k^\star\right),
$$

则称 $\varepsilon_k$ 为次决策扰动。这里 $l_k\in\mathbb R^{|V|}$，$V$ 是词表，$\arg\max$ 给出概率最大的 token 下标；条件的意思是扰动改变了内部状态，却不足以改变立即输出的 token。

这个定义把内部连续状态上的误差和输出上的误差分开，是后面两个定理的公共语言：CoT 只关心输出，所以次决策扰动对它无害；Latent CoT 把状态原样传给下一步，所以同样的扰动会留下来。

## 定理 4.7（CoT 的符号完整性）

设 $S^\star=(s_1^\star,\ldots,s_M^\star)$ 是无噪声的 CoT 轨迹，$\hat S=(\hat s_1,\ldots,\hat s_M)$ 是每一步都加入次决策扰动后的轨迹。则

$$
\Pr\left[\hat S\ne S^\star\right]=0 .
$$

**证明。** 对步数 $k$ 做归纳。第 1 步两边输入相同，都是 $x$ 加上空历史，模型的前向函数 $f_\theta$ 是确定性的，给出同一个 logit 向量 $l_1^\star$。由于扰动是次决策的，

$$
\hat s_1=\arg\max\left(l_1^\star+\varepsilon_1\right)=\arg\max\left(l_1^\star\right)=s_1^\star .
$$

假设前 $k-1$ 步的 token 都相同，那么传给第 $k$ 步的离散历史也相同，确定性前向函数给出

$$
f_\theta\!\left(x,\hat S^{(1:k-1)}\right)=f_\theta\!\left(x,S^{\star(1:k-1)}\right)=l_k^\star ,
$$

这里 $\hat S^{(1:k-1)}$ 与 $S^{\star(1:k-1)}$ 分别是两条轨迹的前 $k-1$ 步。再按次决策条件，$\hat s_k=\arg\max(l_k^\star+\varepsilon_k)=s_k^\star$。归纳得到所有 $k=1,\ldots,M$ 都相同，故轨迹不一致的概率为零。$\square$

关键机制是 $\arg\max$ 把连续状态重新投影到离散 token：每一步都丢弃不足以改变决策的噪声，噪声因此不跨步累积。这就是所谓的离散重置。在 AI 语境下，它解释了显式 CoT 为什么对内部数值误差不敏感：只要误差没大到改变排序，输出序列就完全不变。这个论证依赖扰动加在 logit 上而不是加在历史上；如果扰动改动了已经发出的 token，归纳的第一步就不成立了。

## 定理 4.8（潜在计算中的误差累积）

设潜在转移为 $h_k=f_\theta(h_{k-1})+\varepsilon_h^{(k)}$，这里 $f_\theta$ 的 Lipschitz 常数为 $L_F$，$\varepsilon_h^{(k)}\overset{\rm iid}{\sim}\mathcal N(0,\sigma_h^2I_d)$ 是第 $k$ 步注入的高斯噪声，$I_d$ 是 $d$ 维单位阵。令 $E_k=h_k-h_k^\star$ 是第 $k$ 步状态与无噪声状态的偏差，且 $E_0=0$。则

$$
\mathbb E\|E_M\|_2^2\le
\begin{cases}
\displaystyle\frac{1-L_F^{2M}}{1-L_F^2}\,d\sigma_h^2,&L_F\ne1,\\[6pt]
Md\sigma_h^2,&L_F=1 .
\end{cases}
$$

并且对任意 $M\ge1$ 都有 $\mathbb E\|E_M\|_2^2\ge d\sigma_h^2>0$。

这里是上界而不是等式，原文写成等号。递推只给出不等式；等号要在误差被 $f_\theta$ 沿整条轨迹恰好按比例 $L_F$ 放大时才成立（例如线性映射且误差方向对齐）。

**证明。** 由 Lipschitz 性，

$$
E_k=f_\theta(h_{k-1})-f_\theta(h_{k-1}^\star)+\varepsilon_h^{(k)} .
$$

两边取平方的期望。噪声 $\varepsilon_h^{(k)}$ 与过去独立且零均值，交叉项为零；再用 $\|f_\theta(a)-f_\theta(b)\|_2\le L_F\|a-b\|_2$，得到

$$
\mathbb E\|E_k\|_2^2\le L_F^2\,\mathbb E\|E_{k-1}\|_2^2+d\sigma_h^2 .
$$

以 $E_0=0$ 迭代这个非齐次线性递推，得到几何级数

$$
\mathbb E\|E_M\|_2^2\le d\sigma_h^2\sum_{t=0}^{M-1}L_F^{2t},
$$

它在 $L_F\ne1$ 时等于 $\frac{1-L_F^{2M}}{1-L_F^2}d\sigma_h^2$，在 $L_F=1$ 时等于 $Md\sigma_h^2$。另一方面，最后一步的噪声是独立注入的，

$$
\mathbb E\|E_M\|_2^2=\mathbb E\left\|f_\theta(h_{M-1})-f_\theta(h_{M-1}^\star)\right\|_2^2+d\sigma_h^2\ge d\sigma_h^2 ,
$$

所以误差恒为正。$\square$

与定理 4.7 对照，差别在于有没有纠错投影：离散 token 每一步重置误差，连续隐状态没有这一步，任何未被抵消的偏差都留在后续状态里。$L_F>1$ 时误差指数增长，$L_F\le1$ 时误差也会线性或饱和式累积。在 AI 语境下，这就是 Latent CoT 在 GSM8K 这类需要精确数值的任务上失效的机制：链越长，最终状态越偏离正确的那一点，而答案恰好对状态很敏感。

## 定义 4.9（符号指数）

在合法词表 $V$ 的决策点，令 $p(u\mid h,x)$ 为模型输出分布。符号指数定义为最大 token 概率

$$
I_S=\max_{u\in V}p(u\mid h,x)\in\left[\frac{1}{|V|},1\right].
$$

这里 $|V|$ 是词表大小。$I_S$ 接近 1 表示模型几乎确定地提交一个 token，较小的 $I_S$ 表示概率分散在多个候选上。实验里为了排除低概率长尾的影响，统计的是 nucleus 重归一化之后的概率。

这是全文的统一调节量：它同时出现在稳定性下界（定理 4.11）和探索散度下界（定理 4.12）里，把执行与探索两种能力接到同一个可测量上。显式 CoT 的 $I_S$ 接近 1，Latent CoT 的 $I_S$ 在 $[0.2,0.5]$ 量级，这个差别不是架构的副产品，而是下面两个定理的因。

## 定义 4.10（Logit 决策间隔）

设最可能和第二可能 token 的 logits 分别为 $l_{i^\star}$ 与 $l_{j^\star}$，定义

$$
\Delta_l=l_{i^\star}-l_{j^\star}.
$$

这里 $i^\star,j^\star$ 是这两个 token 在词表中的下标。它是离散决策抵抗 logit 噪声的安全间隔：只有噪声大到能把这两个 logit 的排序翻转，输出才会改变。

## 定理 4.11（符号稳定性）

符号指数与决策间隔满足

$$
\Delta_l\ge\log\left(\frac{I_S}{1-I_S}\right).
$$

**证明。** softmax 给出

$$
\frac{p_{i^\star}}{p_{j^\star}}=e^{l_{i^\star}-l_{j^\star}}=e^{\Delta_l},
\qquad
\Delta_l=\log p_{i^\star}-\log p_{j^\star}.
$$

由定义 $p_{i^\star}=I_S$。其余 token 的概率总和为 $1-I_S$，而 $p_{j^\star}$ 是其中最大的一个，所以 $p_{j^\star}\le1-I_S$。由于 $-\log$ 单调递减，

$$
\Delta_l=\log I_S-\log p_{j^\star}\ge\log I_S-\log(1-I_S)=\log\frac{I_S}{1-I_S}.
$$

$\square$

这说明 $I_S$ 对数值稳定性的作用是直接可算的：$I_S=0.99$ 时下界约为 $\log99\approx4.6$，$I_S=0.6$ 时只有 $\log1.5\approx0.4$。前者的间隔足以吸收相当大的噪声，后者一个小扰动就能翻转排序。在 CoT 与 latent reasoning 的对比里，这条不等式给出了高确定性为什么等于抗噪的定量版本，也解释了定理 4.7 里离散重置的力量来自哪里。

## 定理 4.12（探索-执行权衡）

对有 $B$ 个合法选项的决策，任意分布 $p$ 若其符号指数为 $I_S=\max_ip_i$，则

$$
D_{\rm KL}(q_{\rm PR}\|p)\ge
-\log B-\frac1B\left[\log I_S+(B-1)\log\left(\frac{1-I_S}{B-1}\right)\right].
$$

右端在 $I_S=1/B$（完全均匀）时取最小值 $0$，在 $I_S\to1$ 时按 $\frac{B-1}{B}\log\frac{1}{1-I_S}$ 增长。

原文把这条不等式写成了 $\log B+I_S\log I_S+(1-I_S)\log\frac{1-I_S}{B-1}$。把取到最坏情形的分布 $p=\left(I_S,\frac{1-I_S}{B-1},\ldots,\frac{1-I_S}{B-1}\right)$ 代入会发现，后者恰好是 $D_{\rm KL}(p\|q_{\rm PR})$，方向反了；而定理要界的是 $D_{\rm KL}(q_{\rm PR}\|p)$，在那个分布处它的值是左边这个式子。两者只在 $I_S=1/B$ 处相等，其余位置反方向的值更大，例如 $B=3$、$I_S=0.5$ 时前者为 $0.0589$，而 $D_{\rm KL}(q_{\rm PR}\|p)$ 只有 $0.0566$，所以按原式写的下界并不成立。

**证明。** 直接展开均匀先验与模型分布的 KL 散度：

$$
D_{\rm KL}(q_{\rm PR}\|p)=-\log B-\frac1B\sum_{i=1}^B\log p_i .
$$

固定最大概率为 $I_S$，设对应分量为 $p_{i^\star}=I_S$，其余 $B-1$ 个分量的总和为 $1-I_S$。要给出 KL 的下界，就要给出 $\sum_i\log p_i$ 的上界。$\log$ 是凹函数，而约束 $\sum_{i\ne i^\star}p_i=1-I_S$ 是线性的，由 Jensen 不等式，其余分量取均匀时这个和最大，即 $p_i=(1-I_S)/(B-1)\;(i\ne i^\star)$。代入得

$$
\sum_{i=1}^B\log p_i\le\log I_S+(B-1)\log\frac{1-I_S}{B-1},
$$

回代即得所需下界。$\square$

这个证明把稳定性与探索性压缩到同一个可计算指标 $I_S$ 上：提高 $I_S$ 会让定理 4.11 的安全间隔变大，同时让这里的 KL 下界变大，也就是离均匀探索更远。在 AI 语境下，它说明不存在同时最大化执行精度与探索广度的单一设置，任务需要哪一种，就得把 $I_S$ 调到对应的一端。

## 附录 A.7 的归一化准确率推导

这一段把定理 4.8 的状态误差接到实验里测到的准确率曲线上。它不是定理，而是一段线性化近似，默认噪声不大、动力学可以用一阶近似描述。

设无噪声的最终 latent 状态为 $h_M^\star$。线性化多步转移动力学后，各步注入的高斯噪声合并为一个等价的扰动：

$$
\tilde h_M=h_M^\star+\varepsilon_{\rm acc},\qquad
\varepsilon_{\rm acc}\sim\mathcal N(0,\sigma_{\rm eff}^2I_d),
$$

这里 $\sigma_{\rm eff}^2=\alpha\sigma^2$，而 $\alpha$ 由路径长度和转移函数的 Lipschitz 常数决定。具体地，把每步的 Jacobian 记为 $J_t$，则误差为 $\sum_t(J_{M-1}\cdots J_{t+1})\varepsilon_h^{(t)}$，其协方差在谱范数意义下不超过 $\sigma^2\sum_{t=0}^{M-1}L_F^{2t}$，所以 $\alpha\le\sum_{t=0}^{M-1}L_F^{2t}$，与定理 4.8 的系数一致。

token 决策发生在 logit 空间而不是 latent 空间，所以要把扰动过一遍输出层。令语言模型头的矩阵为 $W_U\in\mathbb R^{|V|\times d}$，则

$$
\tilde l=W_U\tilde h_M=l^\star+\xi,\qquad \xi=W_U\varepsilon_{\rm acc},
$$

这里 $l^\star=W_Uh_M^\star$ 是无噪声的 logits。$\xi$ 是高斯向量经线性变换的结果，仍是高斯的。

设正确 token 为 $i^\star$，最强竞争 token 为 $j^\star$，无噪声的 logit 间隔为 $\Delta_l=l_{i^\star}^\star-l_{j^\star}^\star$。保持正确排序的条件是

$$
\tilde l_{i^\star}>\tilde l_{j^\star}
\Longleftrightarrow
\xi_{j^\star}-\xi_{i^\star}<\Delta_l .
$$

令 $\zeta=\xi_{j^\star}-\xi_{i^\star}$。它是 $\xi$ 的线性组合，因而

$$
\zeta=(w_{j^\star}-w_{i^\star})^\top\varepsilon_{\rm acc}\sim\mathcal N(0,C^2\sigma^2),
$$

这里 $w_j$ 是 $W_U$ 的第 $j$ 行，$C=\sqrt{\alpha}\,\|w_{j^\star}-w_{i^\star}\|_2$ 把输出层的行差、路径长度和噪声放大都吸收了。记标准正态分布函数为 $\Phi$，则归一化准确率为

$$
A(\sigma)=\Pr\left(\zeta<\Delta_l\right)=\Phi\!\left(\frac{\Delta_l}{C\sigma}\right).
$$

当 $\sigma\to0$ 时 $\Delta_l/(C\sigma)\to\infty$，准确率保持在高原；噪声增大后这个比值下降，准确率呈 S 形衰减。这个式子把鲁棒性拆成两个因子的比：符号指数诱导的间隔 $\Delta_l$ 在分子，累计噪声的标准差 $C\sigma$ 在分母。它默认只有一个竞争者能翻转结果，多条候选同时逼近时会有偏离，这一点在噪声较大时才会显现。

## 定理 5.1（无课程训练必然失败）

设无课程训练用的数据集 $D_{\rm nc}$ 来自有偏的 latent 分布 $P_{\rm biased}$。若这个分布本身比专家策略 $\theta^\star$ 差至少 $\Delta>0$：

$$
R(P_{\rm biased})\le R(\theta^\star)-\Delta ,
$$

则在该数据上训练得到的最大似然估计 $\hat\theta_{\rm MLE}$ 满足

$$
R(\hat\theta_{\rm MLE})\le R(\theta^\star)-C(\Delta),
$$

这里 $C(\Delta)>0$ 与偏差有关、与数据集规模无关。因此偏差造成的性能损失不会因为增加数据而消失。

这里 $R(\theta)=\mathbb E_{x\sim\rho,\,h\sim P_\theta(\cdot\mid x)}[V(h)]$ 是任务成功率，$\rho$ 是输入分布，$V(h)\in\{0,1\}$ 是取值函数，$V(h)=1$ 表示从状态 $h$ 出发能得到正确答案。

**证明。** 构造三维 latent 空间中的反例。正确状态 $h_{\rm expert}$ 的特征为 $\phi(h_{\rm expert})=[1,0,0]^\top$，shortcut 状态 $h_{\rm shortcut}$ 的特征为 $\phi(h_{\rm shortcut})=[0,1,1]^\top$，无关状态 $h_{\rm bad}$ 的特征为 $\phi(h_{\rm bad})=[0,1,0]^\top$。取值函数只在 $h_{\rm expert}$ 处为 1，其余为 0，因此 $R(\theta)=P_\theta(h_{\rm expert})$。参数为 $\theta\in\mathbb R^3$，模型在这三个状态上是 softmax：$P_\theta(h)\propto\exp(\theta^\top\phi(h))$。

令专家参数 $\theta^\star=[10,0,0]^\top$。三个状态的得分分别是 $10,0,0$，于是

$$
R(\theta^\star)=\frac{e^{10}}{e^{10}+1+1}\approx1 .
$$

现在令偏置数据完全由 shortcut 状态组成，$P_{\rm biased}(h_{\rm shortcut})=1$，则 $R(P_{\rm biased})=0$，满足定理条件且间隔 $\Delta\approx1$。

在这份数据上做 MLE，唯一的自由是提高 shortcut 的得分 $\theta_2+\theta_3$：似然函数对这个组合单调递增，没有内点最大值，最优解于是把这条相对得分推得任意大，可趋向参数 $[0,K,K]^\top$，$K\to\infty$。此时三个状态的得分为 $0,2K,K$，于是

$$
P_{\hat\theta_{\rm MLE}}(h_{\rm shortcut})\to1,\qquad
P_{\hat\theta_{\rm MLE}}(h_{\rm expert})=\frac{1}{1+e^{2K}+e^{K}}\to0 .
$$

所以 $R(\hat\theta_{\rm MLE})\to0$，与接近 1 的专家成功率保持正差距。取任何 $C<R(\theta^\star)$（例如 $C=1/2$），当 $n$ 足够大时 $R(\hat\theta_{\rm MLE})\le R(\theta^\star)-C$ 成立。$\square$

这个证明是构造性的：它说明存在这样的有偏数据和特征结构，使 MLE 被困在次优策略上，而不说明任意有偏分布都会造成同等的损失。要得到普遍结论，需要对 $V$ 与 $P_{\rm biased}$ 的支撑加条件，例如要求偏置分布的支撑落在 $V=0$ 的区域，且特征能把该支撑与其他状态分开；上面的构造就是这一情形的最简实例。

在 AI 语境下，这条结果说的是：模型从自己生成的 shortcut latent 上学习时，梯度会把“看起来像推理”的表面特征强化到底，因为训练目标只要求拟合这些状态，没有信息告诉它正确路径在哪里。这种偏差误差与随样本量消失的统计误差不同，加数据不会消除它。

## 定理 5.2（使用课程训练的可证明成功）

在标准统计学习条件下，课程数据集 $D_c$ 含有 $n$ 个由专家 latent 策略 $P_{\theta^\star}$ 独立生成的样本 $(x_i,h_i)$。以最大似然训练得到 $\hat\theta$，则以至少 $1-\delta$ 的概率

$$
R(\hat\theta)\ge R(\theta^\star)-O\!\left(\sqrt{\frac{d\log n+\log(1/\delta)}{n}}\right).
$$

因此 $n\to\infty$ 时性能差距消失。课程的作用是让训练分布与专家 latent 分布一致，而不是让模型从自身早期的 shortcut 状态学习。这里的标准条件指引理 A.6 列出的四条：特征有界、期望负对数似然强凸、真参数处 score 次高斯、参数位于紧集。

### 附录中的模仿学习解释

上面的定理假设数据来自专家 latent 策略 $P_{\theta^\star}(h\mid x)$，而 Coconut 实际监督的是“用专家轨迹的前缀去预测后缀”。两者可以等同，理由如下。

令 $P_{\theta^\star}(h\mid x)$ 为专家 latent 策略，它由最优编码器作用于专家轨迹前缀得到：

$$
P_{\theta^\star}(h\mid x)=\mathop{\rm Law}\!\left(E_{\theta^\star}\!\left(S_{\rm past}^\star\right)\mid x\right),
$$

这里 $E_{\theta^\star}$ 是定理 4.1 意义下的最优编码器，它把专家前缀 $S_{\rm past}^\star$ 映射成预测未来所需的最小充分统计量。数据处理不等式给出

$$
I\!\left(S_{\rm past}^\star;S_{\rm future}^\star\mid x\right)
\ge I\!\left(E_\theta\!\left(S_{\rm past}^\star\right);S_{\rm future}^\star\mid x\right),
$$

因为 $E_\theta(S_{\rm past}^\star)$ 是 $S_{\rm past}^\star$ 的函数，处理它不可能增加关于未来的信息；最优编码器取等，此时 $S_{\rm future}^\star$ 在给定 $h$ 与 $x$ 下与 $S_{\rm past}^\star$ 条件独立，预测未来只需 $h$。于是 Coconut 损失只在编码器诱导的 latent 分布与 $P_{\theta^\star}$ 不一致时增加，在专家轨迹上最小化它就等价于在隐式数据集 $\{(x_i,\,h_i=E_{\theta^\star}(S_{{\rm past},i}^\star))\}$ 上做 MLE。这就把课程训练放进了模仿学习的框架，定理 5.2 因此适用于 Coconut。

### 引理 A.5（向量鞅的自归一化界）

设 $\{\mathcal F_i\}_{i=0}^n$ 是滤过，即一列递增的 $\sigma$-代数，$\mathcal F_i$ 可以理解为“到第 $i$ 步为止已知的信息”。设 $g_i\in\mathbb R^d$ 满足 $g_i$ 可由 $\mathcal F_i$ 测量、$\mathbb E[g_i\mid\mathcal F_{i-1}]=0$，且对任意单位向量 $v$，$\langle v,g_i\rangle$ 条件上是 $\sigma$-次高斯的：

$$
\mathbb E\left[e^{\lambda\langle v,g_i\rangle}\mid\mathcal F_{i-1}\right]\le e^{\lambda^2\sigma^2/2}
\qquad\text{对一切 }\lambda\in\mathbb R .
$$

这里“$\mathcal F_i$ 可测”指 $g_i$ 由前 $i$ 步的信息决定，条件期望为零指 $g_i$ 在已知前 $i-1$ 步时是公平的增量，这样的序列称为鞅差序列；次高斯条件说明任意方向上的投影都有高斯型的尾部，它比有限方差更强，但不需要独立同分布。给定正定矩阵 $V$，定义

$$
V_n=V+\sum_{i=1}^ng_ig_i^\top,\qquad G_n=\sum_{i=1}^ng_i .
$$

则对任意 $\delta\in(0,1)$，以至少 $1-\delta$ 的概率有

$$
\|G_n\|_{V_n^{-1}}^2\le2\sigma^2\log\left(\frac{\det(V_n)^{1/2}}{\det(V)^{1/2}\,\delta}\right),
$$

这里 $\|G_n\|_{V_n^{-1}}^2=G_n^\top V_n^{-1}G_n$ 是以 $V_n$ 为度量的加权范数。

左边的分母是 $G_n$ 自己的累积协方差，所以界的大小随梯度的实际幅度自动调整，不需要事先知道梯度有多大，这类结果因此叫自归一化。右边的 $\log\det$ 比值度量的是有效维度：如果梯度只在少数几个方向上变化，行列式增长慢，界就紧。它在后面被用来把随机梯度的波动转成参数误差，是整个置信集合论证里唯一的概率工具。

### 引理 A.6（参数估计的置信集合）

设课程数据 $D_c=\{(x_i,h_i)\}_{i=1}^n$ 独立采自专家分布 $P_{\theta^\star}$，并令

$$
\hat\theta_{\rm MLE}=\arg\max_\theta\sum_{i=1}^n\log P_\theta(h_i\mid x_i).
$$

假设：

1. 特征有界：对一切 $(x,h)$，$\|\phi(x,h)\|_2\le L$；
2. 期望负对数似然 $L(\theta)=\mathbb E[-\log P_\theta(h\mid x)]$ 对参数是 $\mu_{\min}$-强凸的，等价地其 Hessian（Fisher 信息）满足 $I(\theta)\succeq\mu_{\min}I$；
3. 真参数处的 score $\nabla_\theta\log P_{\theta^\star}(h\mid x)$ 是零均值、$\sigma^2$-次高斯的随机向量；
4. 参数位于紧集 $B=\{\theta:\|\theta\|_2\le B\}$。

记经验 Hessian 为

$$
\hat H_n=\frac1n\sum_{i=1}^n\nabla_\theta^2\left[-\log P_{\hat\theta_{\rm MLE}}(h_i\mid x_i)\right].
$$

则存在只依赖于 $L,\sigma,\mu_{\min},B$ 的常数 $C$，使以至少 $1-\delta$ 的概率

$$
\left\|\hat\theta_{\rm MLE}-\theta^\star\right\|_{\hat H_n}^2
\le\beta_n^2(\delta),\qquad
\beta_n^2(\delta)=C\,\frac{d\log n+\log(1/\delta)}{n}.
$$

这里的加权范数 $\|\Delta\|_{\hat H_n}^2=\Delta^\top\hat H_n\Delta$ 用经验曲率作度量：在曲率大的方向上，同样的参数偏差对应更大的似然损失，所以误差必须更小。强凸性假设 2 保证这个度量不会退化。

**证明。** 记经验风险 $L_n(\theta)=n^{-1}\sum_i\ell_i(\theta)$，其中 $\ell_i(\theta)=-\log P_\theta(h_i\mid x_i)$。由 MLE 的最优性 $L_n(\hat\theta_{\rm MLE})\le L_n(\theta^\star)$；由 $L(\theta)$ 在 $\theta^\star$ 处取最小且强凸，

$$
L(\hat\theta_{\rm MLE})-L(\theta^\star)\ge\frac{\mu_{\min}}2\left\|\hat\theta_{\rm MLE}-\theta^\star\right\|_2^2 .
$$

另一方面，把 $\nabla L_n(\hat\theta_{\rm MLE})=0$ 在 $\theta^\star$ 附近作一阶 Taylor 展开：

$$
0=\nabla L_n(\theta^\star)+\hat H_n^\circ\left(\hat\theta_{\rm MLE}-\theta^\star\right),
$$

这里 $\hat H_n^\circ=\int_0^1\nabla^2L_n(\theta^\star+t(\hat\theta_{\rm MLE}-\theta^\star))\,\mathrm dt$ 是两点之间线段上的平均 Hessian。于是

$$
\hat\theta_{\rm MLE}-\theta^\star=-(\hat H_n^\circ)^{-1}\nabla L_n(\theta^\star).
$$

其中 $\nabla L_n(\theta^\star)=n^{-1}\sum_ig_i$，$g_i=\nabla_\theta\ell_i(\theta^\star)$ 正是引理 A.5 里的鞅差序列（由假设 3，它零均值且条件次高斯）。取 $V=\lambda I$（$\lambda>0$）并应用引理 A.5，得到 score 在加权范数下的高概率界；用特征有界性把行列式项控制成 $d\log n$ 的量级，得到

$$
\left\|\nabla L_n(\theta^\star)\right\|_{(I(\theta^\star))^{-1}}^2
\lesssim\frac{d\log n+\log(1/\delta)}{n}.
$$

最后一步是用矩阵集中不等式说明 $\hat H_n^\circ$ 与 $\hat H_n$ 都在算子范数意义下接近 $I(\theta^\star)$，从而可以把上面两个范数互相替换，代价是常数因子。于是

$$
\left\|\hat\theta_{\rm MLE}-\theta^\star\right\|_{\hat H_n}^2
\le C\,\frac{d\log n+\log(1/\delta)}{n}.
$$

$\square$

最后这一步在原文里是“可以证明”带过的：从 score 的 $(I^\star)^{-1}$ 范数界换到参数误差的 $\hat H_n$ 范数界，需要对平均 Hessian 与 $I^\star$ 的接近程度做一致的估计，而这需要假设 1 与 4 配合。结论本身是标准的：强凸损失的经验风险最小化有 $O(d/n)$ 的参数误差。

### 定理 5.2 的证明

分三步。第一步把参数误差换成 KL 散度，第二步用 Pinsker 不等式换成全变差，第三步用全变差控制成功率之差。

**第一步：KL 界。** 对对数线性模型，令 $\Delta=\hat\theta-\theta^\star$。在 $\theta^\star$ 附近对 $\log P_{\hat\theta}(h\mid x)$ 作二阶 Taylor 展开，

$$
\log P_{\hat\theta}(h\mid x)\approx\log P_{\theta^\star}(h\mid x)+\left\langle\nabla_\theta\log P_{\theta^\star}(h\mid x),\Delta\right\rangle+\frac12\Delta^\top\nabla_\theta^2\log P_{\theta^\star}(h\mid x)\,\Delta .
$$

代入 $D_{\rm KL}(P_{\theta^\star}\|P_{\hat\theta})=\mathbb E_{P_{\theta^\star}}[\log P_{\theta^\star}-\log P_{\hat\theta}]$，线性项的期望为零（真参数处 score 的均值为零），二次项的期望给出 Fisher 信息：

$$
\mathbb E_{x\sim\rho}\left[D_{\rm KL}\!\left(P_{\theta^\star}\|P_{\hat\theta}\right)\right]
=\frac12\Delta^\top I(\theta^\star)\Delta+\text{高阶项}.
$$

由引理 A.6，$\Delta$ 在 $\hat H_n$ 范数下很小，而 $\hat H_n$ 集中到 $I(\theta^\star)$，所以存在常数 $C$ 使

$$
\mathbb E_{x\sim\rho}\left[D_{\rm KL}\!\left(P_{\theta^\star}\|P_{\hat\theta}\right)\right]
\le C\,\frac{d\log n+\log(1/\delta)}{n}.
$$

**第二步：KL 转为全变差距离。** Pinsker 不等式给出

$$
{\rm TV}(P,Q)\le\sqrt{\frac12D_{\rm KL}(P\|Q)} .
$$

对 $x$ 取期望并用 Jensen 不等式（$\sqrt{\cdot}$ 是凹函数，可以把期望收到根号里面）：

$$
\mathbb E_x\left[{\rm TV}\!\left(P_{\theta^\star},P_{\hat\theta}\right)\right]
\le\sqrt{\frac12\,\mathbb E_x\left[D_{\rm KL}\!\left(P_{\theta^\star}\|P_{\hat\theta}\right)\right]}
=O\!\left(\sqrt{\frac{d\log n+\log(1/\delta)}{n}}\right).
$$

**第三步：全变差距离控制成功率。** 任务成功函数 $V(h)\in\{0,1\}$ 有界，而全变差距离是使两个分布下任意有界函数的期望差达到最大的那个量，因此

$$
\begin{aligned}
\left|R(\hat\theta)-R(\theta^\star)\right|
&=\left|\mathbb E_x\left[\mathbb E_{P_{\hat\theta}}V(h)-\mathbb E_{P_{\theta^\star}}V(h)\right]\right|\\
&\le\mathbb E_x\left[{\rm TV}\!\left(P_{\theta^\star},P_{\hat\theta}\right)\right].
\end{aligned}
$$

代入第二步的界并取下界，得到

$$
R(\hat\theta)\ge R(\theta^\star)-O\left(\sqrt{\frac{d\log n+\log(1/\delta)}{n}}\right).
$$

$\square$

这条结果与定理 5.1 构成对照：偏差误差有一个不随 $n$ 消失的下限，统计误差却按 $n^{-1/2}$ 消失。课程学习之所以可证明有效，正是因为它把无课程训练中的分布错配换成了普通的样本量问题。在 AI 语境下，这意味着训练数据必须覆盖专家 latent 的状态，而不是让模型在自己生成的 shortcut 状态上自洽。

## 把各条结果串起来

全文只有一个旋钮：符号指数 $I_S$。它同时出现在两条不等式里，于是执行与探索的对立不是两种架构的经验差别，而是同一个量的两个后果。

执行一侧，定理 4.11 给出 $\Delta_l\ge\log\frac{I_S}{1-I_S}$，把确定性换成 logit 间隔；定理 4.7 说明离散 argmax 在每个 token 处丢弃次决策噪声，所以高 $I_S$ 带来的大间隔能兑换成稳定性。探索一侧，定理 4.12 给出对均匀分布 KL 的下界，$I_S$ 偏离 $1/B$ 就必然偏离均匀探索；定理 4.5 说明 Latent CoT 的 KL 被一个与训练确定性参数无关的常数卡住。定理 4.3 与 4.5 因此是同一枚硬币的两面：显式 CoT 的散度按 $\log\kappa$ 发散，Latent CoT 的散度有界。

代价则落在误差累积上。定理 4.8 说明没有离散重置时误差按 $L_F^{2M}$ 或 $M$ 累积，附录 A.7 把这个状态误差换算成准确率曲线，得到的比值 $\Delta_l/(C\sigma)$ 正好是间隔除以噪声。高 $I_S$ 让分子大，低 $L_F$ 或短链让分母小；任务对哪一个敏感，就决定了哪种架构合适。

训练一侧，定理 5.1 与 5.2 说明课程学习的必要性来自分布错配而不是优化困难：无课程时模型在自生成的 shortcut latent 上做 MLE，偏差误差不随数据量消失；有课程时数据来自专家 latent 策略，剩下的只是统计误差。把课程的每个阶段读成一次 $I_S$ 的调度，前段用高 $I_S$ 保证 token 级梯度，后段用低 $I_S$ 允许叠加多条路径，这与定理 4.1 中 $\beta(k)\asymp k/(M-k)$ 的走势是同一件事的两种说法。

这条故事线有四处接缝。定理 4.5 需要合法 token 概率的正下界，而引理 A.4 只给了上界；定理 4.8 是期望意义下的界，不是高概率界；附录 A.7 是线性化近似，噪声大时会偏离；定理 5.1 的反例只说明失败可以发生，不说明所有有偏分布都同样失败。
